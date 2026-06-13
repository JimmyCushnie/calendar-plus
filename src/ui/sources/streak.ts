import type { Moment } from "src/types/moment";
import type { TFile } from "obsidian";
import type { ICalendarSource, IDayMetadata, IDot } from "src/ui/calendar-ui/types";
import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import { get } from "svelte/store";

import { dailyNotes, settings, weeklyNotes } from "../stores";
import { classList } from "../utils";

const getStreakClasses = (file: TFile | null): string[] => {
  return classList({
    "has-note": !!file,
  });
};

const getNoteExistsDots = (file: TFile | null): IDot[] => {
  if (!file) return [];
  // The presence dot is only emitted in "exists" mode. In "word-count-tasks"
  // mode, the word-count source emits filled dots instead and the tasks
  // source emits the open-task hollow dot; this source still emits the
  // `has-note` class either way so themes can target it as a hook.
  const { dotMode } = get(settings);
  if (dotMode !== "exists") return [];
  return [{ isFilled: true }];
};

export const streakSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    return {
      classes: getStreakClasses(file),
      dots: getNoteExistsDots(file),
    };
  },

  getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const file = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
    return {
      classes: getStreakClasses(file),
      dots: getNoteExistsDots(file),
    };
  },
};
