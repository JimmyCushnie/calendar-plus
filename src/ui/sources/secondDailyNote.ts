import type { Moment } from "src/types/moment";
import { get } from "svelte/store";

import { getPeriodicNote as helperGetPeriodicNote } from "src/io/periodicNoteHelpers";
import type { ICalendarSource, IDayMetadata } from "src/ui/calendar-ui/types";

import { secondDailyNotes, settings } from "../stores";

export const secondDailyNoteSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    if (!get(settings).secondDaily.enabled) return { dots: [] };
    const file = helperGetPeriodicNote(date, "daily", get(secondDailyNotes) ?? {});
    return { dots: file ? [{ isFilled: true, className: "second-daily" }] : [] };
  },
  getWeeklyMetadata: async (): Promise<IDayMetadata> => ({ dots: [] }),
};
