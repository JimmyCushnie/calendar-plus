import { normalizePath } from "obsidian";
import type { App, TFile } from "obsidian";
import { debounce } from "obsidian";

// Persistent, downscaled-thumbnail cache for featured images.
//
// Why this exists: featured images are full-resolution photos used as ~40px cell
// backgrounds. Decoding the full image on every render (especially a month of
// them when the sidebar opens) is expensive and memory-heavy. Instead we
// generate a small thumbnail once, store it as a file in the plugin's folder
// (`.obsidian/plugins/calendar-plus/thumbnail-cache/`), and render that. After
// the first generation, every render reads a tiny image — cheap on any device.
//
// Design notes:
// - Persistent (plugin-folder files) so the thumbnail is generated once *ever*
//   per device, not once per session — important on low-spec phones, where
//   re-decoding full-res images every launch would be a battery/CPU cost.
// - Non-blocking: `getThumbnailUrl` never decodes synchronously. It returns a
//   ready URL or null; on a miss it kicks off background preparation and fires
//   the (debounced) ready callback when done, which the view turns into a tick
//   so the cell re-resolves and the image pops in.
// - Generation is bounded-concurrency so a cold month (~30 images) doesn't
//   decode everything at once.
// - The day↔image association is NOT stored here — that's always derived live
//   from the note. This cache only maps an image file (path + mtime) to its
//   downscaled thumbnail, and is fully regenerable/disposable.

const MAX_DIM = 128; // longest thumbnail edge in px (cells are ~40px; this is retina-safe)
const JPEG_QUALITY = 0.72;
const MAX_CONCURRENT_GENERATIONS = 3;

let app: App | null = null;
let cacheDir: string | null = null;
let dirReady: Promise<void> | null = null;

// key -> object URL of the ready thumbnail (or a full-res fallback on failure).
const urlByKey = new Map<string, string>();
// key -> in-progress preparation, so concurrent requests share one job.
const inFlight = new Map<string, Promise<void>>();

let onReady: (() => void) | null = null;
// Coalesce a burst of "thumbnail ready" events (e.g. a cold month) into one
// refresh so the calendar re-renders once rather than per image.
const fireReady = debounce(() => onReady?.(), 50, true);

let activeGenerations = 0;
const generationQueue: (() => void)[] = [];

export function initThumbnailCache(a: App, dir: string): void {
  app = a;
  cacheDir = normalizePath(dir);
  dirReady = null;
}

/** Registers the callback fired (debounced) when a thumbnail becomes ready. */
export function setThumbnailReadyCallback(cb: () => void): void {
  onReady = cb;
}

/** Revoke object URLs and reset. Called on plugin unload. */
export function teardownThumbnailCache(): void {
  for (const url of urlByKey.values()) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
  urlByKey.clear();
  inFlight.clear();
  onReady = null;
  app = null;
  cacheDir = null;
  dirReady = null;
}

/** True when the cache is initialized and able to persist thumbnails. */
export function isThumbnailCacheAvailable(): boolean {
  return app !== null && cacheDir !== null;
}

/**
 * Remove all cached thumbnails for a given source image path (any mtime), in
 * memory and on disk. Call this when the source image is deleted or renamed so
 * its thumbnail doesn't orphan in the cache folder. Best-effort.
 */
export async function removeThumbnailsForSource(sourcePath: string): Promise<void> {
  const a = app;
  const dir = cacheDir;
  if (!a || !dir) return;
  const prefix = `${hashPath(sourcePath)}-`;

  for (const key of [...urlByKey.keys()]) {
    if (key.startsWith(prefix)) {
      const url = urlByKey.get(key);
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      urlByKey.delete(key);
    }
  }

  try {
    const listing = await a.vault.adapter.list(dir);
    for (const full of listing.files) {
      const name = full.substring(full.lastIndexOf("/") + 1);
      if (name.startsWith(prefix)) await a.vault.adapter.remove(full);
    }
  } catch {
    // best-effort
  }
}

/**
 * The display URL for an image file's thumbnail.
 * - Returns the ready thumbnail (or a cached full-res fallback) when available.
 * - Returns null while a thumbnail is still being prepared — callers should
 *   show no image yet; the ready callback will fire a refresh when it lands.
 * Never decodes synchronously.
 */
export function getThumbnailUrl(file: TFile): string | null {
  const a = app;
  const dir = cacheDir;
  if (!a || !dir) return null;

  const key = keyFor(file);
  const ready = urlByKey.get(key);
  if (ready) return ready;

  if (!inFlight.has(key)) {
    const job = prepare(a, dir, file, key).finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return null;
}

function hashPath(path: string): string {
  // djb2 variant, hex/base36-encoded. Collision risk is negligible for a
  // personal vault, and a collision would only mis-thumbnail one cell.
  let h = 5381;
  for (let i = 0; i < path.length; i++) {
    h = (Math.imul(h, 33) ^ path.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function keyFor(file: TFile): string {
  return `${hashPath(file.path)}-${file.stat.mtime}`;
}

async function prepare(
  a: App,
  dir: string,
  file: TFile,
  key: string
): Promise<void> {
  let url: string | null = null;
  try {
    url = await loadFromDisk(a, dir, key);
    if (!url) url = await generateAndStore(a, dir, file, key);
  } catch {
    url = null;
  }
  if (!url) {
    // Couldn't make a thumbnail (e.g. SVG, decode failure) — fall back to the
    // full-resolution image so the cell still shows something.
    try {
      url = a.vault.getResourcePath(file);
    } catch {
      url = null;
    }
  }
  if (url) {
    urlByKey.set(key, url);
    fireReady();
  }
}

/**
 * Garbage-collect: keep only thumbnails for the given in-use source images (at
 * their current mtime) and delete every other cached thumbnail, in memory and
 * on disk. Used to drop thumbnails for images that are no longer any note's
 * featured image (e.g. a banner the user swapped out) even though the image
 * still exists in the vault. Best-effort.
 */
export async function pruneThumbnailsExcept(inUseFiles: TFile[]): Promise<void> {
  const a = app;
  const dir = cacheDir;
  if (!a || !dir) return;
  const keep = new Set(inUseFiles.map(keyFor));

  for (const key of [...urlByKey.keys()]) {
    if (!keep.has(key)) {
      const url = urlByKey.get(key);
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      urlByKey.delete(key);
    }
  }

  try {
    const listing = await a.vault.adapter.list(dir);
    for (const full of listing.files) {
      const name = full.substring(full.lastIndexOf("/") + 1);
      if (!name.endsWith(".jpg")) continue;
      if (!keep.has(name.slice(0, -4))) await a.vault.adapter.remove(full);
    }
  } catch {
    // best-effort
  }
}

async function ensureDir(a: App, dir: string): Promise<void> {
  if (!dirReady) {
    dirReady = (async () => {
      if (!(await a.vault.adapter.exists(dir))) {
        await a.vault.adapter.mkdir(dir);
      }
    })();
  }
  return dirReady;
}

async function loadFromDisk(
  a: App,
  dir: string,
  key: string
): Promise<string | null> {
  const path = `${dir}/${key}.jpg`;
  if (!(await a.vault.adapter.exists(path))) return null;
  const bytes = await a.vault.adapter.readBinary(path);
  return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
}

async function generateAndStore(
  a: App,
  dir: string,
  file: TFile,
  key: string
): Promise<string | null> {
  // Read + decode inside the concurrency gate. The full-resolution source bytes
  // are large; reading them *before* acquiring a slot would let a cold month
  // (~30 images, all requested in one tick) hold ~30 full-res buffers in memory
  // at once, even though only MAX_CONCURRENT_GENERATIONS decode at a time. Gating
  // the read too caps peak source-byte memory at the concurrency limit — the
  // win that matters on low-spec/mobile.
  await acquireGenerationSlot();
  let thumbBytes: ArrayBuffer | null;
  try {
    const srcBytes = await a.vault.readBinary(file);
    thumbBytes = await generateThumbnail(srcBytes);
  } finally {
    releaseGenerationSlot();
  }
  if (!thumbBytes) return null;

  await ensureDir(a, dir);
  await a.vault.adapter.writeBinary(`${dir}/${key}.jpg`, thumbBytes);
  void pruneStaleSiblings(a, dir, file, key);

  return URL.createObjectURL(new Blob([thumbBytes], { type: "image/jpeg" }));
}

async function generateThumbnail(srcBytes: ArrayBuffer): Promise<ArrayBuffer | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    // No resize options passed: those aren't supported on all mobile webviews,
    // so decode then scale on draw (the full decode is the unavoidable one-time
    // cost; the stored thumbnail is tiny).
    bitmap = await createImageBitmap(new Blob([srcBytes]));
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    // `activeDocument` (not `document`) for popout-window compatibility, per
    // the Obsidian plugin checker. The canvas is off-DOM (never attached), so
    // this is a checker-hygiene change rather than a functional one.
    const canvas = activeDocument.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob ? await blob.arrayBuffer() : null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

// Remove thumbnails for the same source image at older mtimes (i.e. the image
// was edited). Best-effort; runs only on (re)generation, not in steady state.
async function pruneStaleSiblings(
  a: App,
  dir: string,
  file: TFile,
  currentKey: string
): Promise<void> {
  try {
    const prefix = `${hashPath(file.path)}-`;
    const current = `${currentKey}.jpg`;
    const listing = await a.vault.adapter.list(dir);
    for (const full of listing.files) {
      const name = full.substring(full.lastIndexOf("/") + 1);
      if (name.startsWith(prefix) && name !== current) {
        await a.vault.adapter.remove(full);
      }
    }
  } catch {
    // best-effort
  }
}

function acquireGenerationSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT_GENERATIONS) {
    activeGenerations++;
    return Promise.resolve();
  }
  return new Promise((resolve) => generationQueue.push(resolve));
}

function releaseGenerationSlot(): void {
  const next = generationQueue.shift();
  if (next) {
    next(); // hand the slot to the next waiter (activeGenerations stays the same)
  } else {
    activeGenerations--;
  }
}
