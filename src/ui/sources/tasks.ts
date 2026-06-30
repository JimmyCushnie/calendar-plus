import type { Moment } from "src/types/moment";
import type { TFile } from "obsidian";
import { get } from "svelte/store";

import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import type {
  ICalendarSource,
  IDayMetadata,
  IDot,
} from "src/ui/calendar-ui/types";

import { getContentMetrics } from "./contentMetrics";
import { dailyNotes, settings, weeklyNotes } from "../stores";

/**
 * Count the number of unchecked task lines in a note. Self-gated on
 * `dotMode === "word-count-tasks"` so the source has zero cost in the
 * default "exists" mode.
 */
async function getNumberOfRemainingTasks(note: TFile | null): Promise<number> {
  const { dotMode } = get(settings);
  if (dotMode !== "word-count-tasks" || !note) {
    return 0;
  }
  const { openTasks } = await getContentMetrics(note);
  return openTasks;
}

async function getDots(file: TFile | null): Promise<IDot[]> {
  if (!file) return [];
  const numTasks = await getNumberOfRemainingTasks(file);
  // One hollow task dot when any open tasks exist — a presence indicator,
  // not a count.
  return numTasks > 0
    ? [{ className: "task", isFilled: false }]
    : [];
}

export const tasksSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    return { dots: await getDots(file) };
  },

  getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
    return { dots: await getDots(file) };
  },
};
