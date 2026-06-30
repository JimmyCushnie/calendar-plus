import type { Moment } from "src/types/moment";
import type { TFile } from "obsidian";
import { get } from "svelte/store";

import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import type {
  ICalendarSource,
  IDayMetadata,
  IDot,
} from "src/ui/calendar-ui/types";
import { clamp } from "src/ui/calendar-ui/utils";

import { getContentMetrics } from "./contentMetrics";
import { dailyNotes, settings, weeklyNotes } from "../stores";

// Hard cap on how many word-count dots a single cell shows, matching the
// historical behavior the "Word count and open tasks" mode is restoring.
const NUM_MAX_DOTS = 5;
const DEFAULT_WORDS_PER_DOT = 250;

/**
 * Compute how many filled word-count dots a daily/weekly note earns.
 *
 * Self-gated: returns 0 when the user's dot style isn't "word-count-tasks",
 * so this source has zero cost in the default "exists" mode.
 *
 * Word-count and clamp logic ported from the original Calendar plugin
 * (https://github.com/liamcain/obsidian-calendar-plugin), MIT.
 */
async function getWordLengthAsDots(note: TFile | null): Promise<number> {
  const { dotMode, wordsPerDot } = get(settings);
  if (dotMode !== "word-count-tasks" || !note) {
    return 0;
  }
  const perDot = wordsPerDot ?? DEFAULT_WORDS_PER_DOT;
  if (perDot <= 0) {
    return 0;
  }
  const { wordCount } = await getContentMetrics(note);
  const numDots = wordCount / perDot;
  return clamp(Math.floor(numDots), 1, NUM_MAX_DOTS);
}

async function getDots(file: TFile | null): Promise<IDot[]> {
  if (!file) return [];
  const numSolidDots = await getWordLengthAsDots(file);
  const dots: IDot[] = [];
  for (let i = 0; i < numSolidDots; i++) {
    dots.push({ isFilled: true });
  }
  return dots;
}

export const wordCountSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    return { dots: await getDots(file) };
  },

  getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
    return { dots: await getDots(file) };
  },
};
