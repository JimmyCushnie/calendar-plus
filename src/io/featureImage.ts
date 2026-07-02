import { TFile } from "obsidian";
import type { App } from "obsidian";

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "avif",
]);

export function isImagePath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

function extractLinkpath(raw: string): string {
  // Strip ![[...]], [[...]], display aliases (|alias), and bare "..." wrappers
  return raw
    .replace(/^!?\[\[(.+?)(?:\|[^\]]*)?]]$/, "$1")
    .replace(/^"(.+)"$/, "$1")
    .trim();
}

/**
 * Resolve a note's featured image to the vault image **file** (not a URL — the
 * caller turns it into a thumbnail or, failing that, a resource path).
 *
 * Strategy:
 *  1. Check each entry in `frontmatterProperties` (in order). The property
 *     value may be a wikilink (![[img.png]]), a plain filename, or a quoted
 *     string. First valid vault image wins.
 *  2. Fall back to the first `![[…]]` embed in `cache.embeds` that resolves
 *     to an image file.
 *
 * Vault-only: external `https://` URLs are intentionally rejected.
 *
 * Memoized by `(note path, mtime, frontmatterProperties)`: this runs once per
 * visible cell on every `calendar.tick()`, so caching the resolution keeps
 * repeated ticks cheap. A note's `mtime` changes whenever its frontmatter is
 * edited, so the cache invalidates when the source could have changed.
 */
interface FeatureImageCacheEntry {
  mtime: number;
  propsKey: string;
  file: TFile | null;
}
const fileCache = new Map<string, FeatureImageCacheEntry>();

export function resolveFeatureImageFile(
  note: TFile,
  app: App,
  frontmatterProperties: string[]
): TFile | null {
  const propsKey = frontmatterProperties.join(" ");
  const cached = fileCache.get(note.path);
  if (cached && cached.mtime === note.stat.mtime && cached.propsKey === propsKey) {
    return cached.file;
  }
  const file = resolveUncached(note, app, frontmatterProperties);
  fileCache.set(note.path, { mtime: note.stat.mtime, propsKey, file });
  return file;
}

/**
 * Drop the cached resolution for a note. Call this when its metadata changes
 * (the `metadataCache` "changed" event) so the next resolve re-reads the
 * updated cache. Necessary because the cache key includes `mtime`, but the
 * `vault.modify` event bumps `mtime` *before* the metadata cache is reparsed —
 * so a resolve triggered by `modify` can store a stale entry under the new
 * mtime, which a later metadata-change tick would then return (e.g. removing
 * the last image from a note left the featured image showing until reload).
 */
export function invalidateFeatureImageCache(path: string): void {
  fileCache.delete(path);
}

/**
 * Drop cached resolutions that point at a given *image* file. Call this when
 * the image itself is deleted or renamed: the memo is keyed by the referencing
 * *note's* path/mtime, so an image-file event wouldn't otherwise invalidate it,
 * leaving a note cached as resolving to a now-dead `TFile` (broken/blank cell
 * until the note is next edited).
 */
export function invalidateFeatureImageCacheForImage(imagePath: string): void {
  for (const [notePath, entry] of fileCache) {
    if (entry.file?.path === imagePath) fileCache.delete(notePath);
  }
}

function resolveUncached(
  note: TFile,
  app: App,
  frontmatterProperties: string[]
): TFile | null {
  const cache = app.metadataCache.getFileCache(note);
  if (!cache) return null;

  // `FrontMatterCache` indexes to `any`; pull each property out into an
  // explicitly-`unknown` local so the access is type-safe (the reviewer's
  // no-unsafe-* rules flag `any`).
  const fm = cache.frontmatter;
  if (fm) {
    for (const prop of frontmatterProperties) {
      const value: unknown = fm[prop.trim()];
      // A list-valued property (YAML sequence) arrives as an array — use its
      // first entry. Single-string values pass through unchanged.
      const raw: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
      if (typeof raw !== "string") continue;
      const linkpath = extractLinkpath(raw);
      if (!isImagePath(linkpath)) continue;
      const imageFile = app.metadataCache.getFirstLinkpathDest(linkpath, note.path);
      if (imageFile instanceof TFile) {
        return imageFile;
      }
    }
  }

  if (cache.embeds) {
    for (const embed of cache.embeds) {
      const linkpath = embed.link.split("|")[0];
      if (!isImagePath(linkpath)) continue;
      const imageFile = app.metadataCache.getFirstLinkpathDest(linkpath, note.path);
      if (imageFile instanceof TFile) {
        return imageFile;
      }
    }
  }

  return null;
}
