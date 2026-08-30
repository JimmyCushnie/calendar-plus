import type { Moment } from "src/types/moment";
import type { TFile, WorkspaceLeaf } from "obsidian";

import type { ISettings } from "src/settings";

import { tryToCreatePeriodicNoteAndOpen } from "./periodicNotes";

export function tryToCreateDailyNote(
  date: Moment,
  ctrlPressed: boolean,
  settings: ISettings,
  cb?: (newFile: TFile) => void,
  getLeaf?: () => WorkspaceLeaf
): Promise<void> {
  return tryToCreatePeriodicNoteAndOpen("daily", date, ctrlPressed, settings, cb, getLeaf);
}
