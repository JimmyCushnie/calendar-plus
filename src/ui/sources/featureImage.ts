import type { App } from "obsidian";
import { get } from "svelte/store";

import type { Moment } from "src/types/moment";
import type { ICalendarSource, IDayMetadata } from "src/ui/calendar-ui/types";
import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import { getFeatureImageUrl } from "src/io/featureImage";
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
  return {
    getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const s = get(settings);
      if (!s.featureImage.enabled || !s.daily.enabled) return {};
      const file = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
      if (!file) return {};
      const url = getFeatureImageUrl(file, app, s.featureImage.frontmatterProperties);
      return url ? { backgroundImage: url } : {};
    },

    getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const s = get(settings);
      if (!s.featureImage.enabled || !s.featureImage.showForWeekly || !s.weekly.enabled) {
        return {};
      }
      const file = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
      if (!file) return {};
      const url = getFeatureImageUrl(file, app, s.featureImage.frontmatterProperties);
      return url ? { backgroundImage: url } : {};
    },
  };
}
