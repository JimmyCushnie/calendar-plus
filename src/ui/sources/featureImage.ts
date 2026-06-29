import type { App, TFile } from "obsidian";
import { get } from "svelte/store";

import type { Moment } from "src/types/moment";
import type { ICalendarSource, IDayMetadata } from "src/ui/calendar-ui/types";
import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import { resolveFeatureImageFile } from "src/io/featureImage";
import {
  getThumbnailUrl,
  isThumbnailCacheAvailable,
} from "src/io/thumbnailCache";
import { dailyNotes, settings, weeklyNotes } from "../stores";

/**
 * Returns an ICalendarSource that populates `backgroundImage` on day/week
 * cells when the corresponding note has a qualifying image in its frontmatter
 * or embeds.
 *
 * Needs `app` for vault/metadataCache access, so it is created as a factory
 * rather than a plain module-level constant.
 *
 * Self-gated: returns empty metadata when `featureImage.enabled` is false,
 * so it has zero cost when the feature is off.
 */
export function createFeatureImageSource(app: App): ICalendarSource {
  // Resolve a note to the URL we should paint as its cell background: a small
  // cached thumbnail when available, the full-resolution image when there's no
  // cache, or null while a thumbnail is still being generated (the cell shows
  // nothing for that render; a ready callback re-renders it when the thumbnail
  // lands).
  const backgroundFor = (note: TFile, props: string[]): string | null => {
    const imageFile = resolveFeatureImageFile(note, app, props);
    if (!imageFile) return null;
    if (!isThumbnailCacheAvailable()) {
      return app.vault.getResourcePath(imageFile);
    }
    return getThumbnailUrl(imageFile);
  };

  return {
    getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const s = get(settings);
      if (!s.featureImage.enabled || !s.daily.enabled) return {};
      const file = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
      if (!file) return {};
      // Per-note opt-out (toggled from the day-cell menu, stored in settings).
      if (s.featureImage.hiddenNotes.includes(file.path)) return {};
      const url = backgroundFor(file, s.featureImage.frontmatterProperties);
      return url ? { backgroundImage: url } : {};
    },

    getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const s = get(settings);
      if (!s.featureImage.enabled || !s.featureImage.showForWeekly || !s.weekly.enabled) {
        return {};
      }
      const file = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
      if (!file) return {};
      if (s.featureImage.hiddenNotes.includes(file.path)) return {};
      const url = backgroundFor(file, s.featureImage.frontmatterProperties);
      return url ? { backgroundImage: url } : {};
    },
  };
}
