import type { TFile } from "obsidian";

import { getWordCount } from "src/ui/calendar-ui/utils";

// Match open-task lines: `- [ ]` and `* [ ]`. Completed tasks (`- [x]`,
// `- [X]`) are intentionally excluded.
//
// Open-task regex ported from the original Calendar plugin
// (https://github.com/liamcain/obsidian-calendar-plugin), MIT.
const OPEN_TASK_RE = /(-|\*) \[ \]/g;

export interface ContentMetrics {
  wordCount: number;
  openTasks: number;
}

// Memoized note-content metrics for the "word-count-tasks" dot mode, keyed by
// (path, mtime). Both the word-count and tasks sources read the *same* note on
// every visible cell on every tick; without this each did its own
// `cachedRead` + full-string scan per cell per tick. Caching here means one
// read + one scan per note per mtime, shared across both sources and reused
// across ticks. A save bumps mtime, so the entry self-invalidates exactly when
// the content could have changed. The cached value is the *Promise*, so
// concurrent requests for the same note (e.g. overlapping ticks) share one
// read rather than racing.
interface CacheEntry {
  mtime: number;
  metrics: Promise<ContentMetrics>;
}
const cache = new Map<string, CacheEntry>();

async function compute(note: TFile): Promise<ContentMetrics> {
  const contents = await window.app.vault.cachedRead(note);
  return {
    wordCount: getWordCount(contents),
    openTasks: (contents.match(OPEN_TASK_RE) ?? []).length,
  };
}

export function getContentMetrics(note: TFile): Promise<ContentMetrics> {
  const cached = cache.get(note.path);
  if (cached && cached.mtime === note.stat.mtime) {
    return cached.metrics;
  }
  const metrics = compute(note);
  cache.set(note.path, { mtime: note.stat.mtime, metrics });
  // Don't let a transient read failure stick in the cache — drop the entry so
  // a later tick retries (only if it's still the entry we stored).
  void metrics.catch(() => {
    if (cache.get(note.path)?.metrics === metrics) cache.delete(note.path);
  });
  return metrics;
}
