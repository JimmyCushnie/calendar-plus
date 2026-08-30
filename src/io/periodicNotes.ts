import type { Moment } from "src/types/moment";
import { Notice } from "obsidian";
import type { TFile, Workspace, WorkspaceLeaf } from "obsidian";

import type {
  ISettings,
  Periodicity,
  PeriodicNoteSettings,
} from "src/settings";
import type { AppWithFold } from "src/types/obsidian-internal";
import { createConfirmationDialog } from "src/ui/modal";

import {
  applyTemplateTokens,
  ensureParentFolderExists,
  getDateUID,
  getPeriodicNotePath,
  getTemplateInfo,
} from "./periodicNoteHelpers";

const PERIODICITY_LABELS: Record<Periodicity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

// Tracks in-flight `create()` invocations per (periodicity, date) UID so that
// rapid duplicate clicks for the same periodic note don't race on vault.create
// and produce a stray "Unable to create new file" Notice. Lock is acquired at
// create-time and released in a finally block so failures don't leave it stuck.
const inFlight = new Set<string>();

/**
 * Create a periodic note on disk for the given date and return the new
 * `TFile`. Does not open the file — that is the caller's responsibility.
 *
 * Reads format/folder/template only from the supplied per-period settings.
 *
 * Throws on file-create failure (after showing a Notice) so callers can avoid
 * post-creation work like opening a leaf.
 */
export async function createPeriodicNote(
  periodicity: Periodicity,
  date: Moment,
  perPeriodSettings: PeriodicNoteSettings
): Promise<TFile> {
  const path = getPeriodicNotePath(perPeriodSettings, date);
  await ensureParentFolderExists(path);

  const { contents: rawTemplate, foldInfo } = await getTemplateInfo(
    perPeriodSettings.template
  );
  const expanded = applyTemplateTokens(
    rawTemplate,
    periodicity,
    date,
    perPeriodSettings.format
  );

  const { vault } = window.app;
  let createdFile: TFile;
  try {
    createdFile = await vault.create(path, expanded);
  } catch (err) {
    console.error(`[Calendar] Failed to create file: '${path}'`, err);
    new Notice("Unable to create new file.");
    throw err;
  }

  if (foldInfo) {
    (window.app as AppWithFold).foldManager?.save(createdFile, foldInfo);
  }

  return createdFile;
}

/**
 * Create a periodic note with the same confirm-before-create UX the existing
 * per-period IO files use. The optional callback fires after a successful
 * create so callers can open / focus. The callback is awaited, so async
 * callbacks (e.g. openFile then update active-file state) complete before
 * this function resolves.
 */
export async function tryToCreatePeriodicNote(
  periodicity: Periodicity,
  date: Moment,
  settings: ISettings,
  cb?: (newFile: TFile) => void | Promise<void>
): Promise<void> {
  const perPeriod = settings[periodicity];
  const filename = date.format(perPeriod.format);
  const key = getDateUID(date, periodicity);

  const create = async () => {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      const file = await createPeriodicNote(periodicity, date, perPeriod);
      await cb?.(file);
    } finally {
      inFlight.delete(key);
    }
  };

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: create,
      text: `File ${filename} does not exist. Would you like to create it?`,
      title: `New ${PERIODICITY_LABELS[periodicity]} Note`,
    });
  } else {
    await create();
  }
}

/**
 * Pick the destination leaf for a click on a periodic-note target.
 * Plain click → current pane. Modifier + tab-setting → new tab.
 * Modifier + !tab-setting → vertical split.
 */
export function getLeafForModifierClick(
  ctrlPressed: boolean,
  settings: ISettings,
  workspace: Workspace
): WorkspaceLeaf {
  if (!ctrlPressed) return workspace.getLeaf(false);
  return settings.ctrlClickOpensInNewTab
    ? workspace.getLeaf("tab")
    : workspace.getLeaf("split", "vertical");
}

/**
 * Create a periodic note (with confirm-before-create UX) and open it in the
 * leaf chosen by the modifier-click logic. Optional callback fires after the
 * file is opened, useful for caller-side activeFile bookkeeping.
 *
 * `getLeaf` overrides the destination-leaf choice for callers with their own
 * routing rules (day cells do — see `CalendarView.getDayClickLeaf`). It is
 * invoked only after the note is actually created, so a leaf-creating resolver
 * doesn't leave an empty tab behind when the user cancels the confirmation.
 */
export async function tryToCreatePeriodicNoteAndOpen(
  periodicity: Periodicity,
  date: Moment,
  ctrlPressed: boolean,
  settings: ISettings,
  cb?: (newFile: TFile) => void,
  getLeaf?: () => WorkspaceLeaf
): Promise<void> {
  await tryToCreatePeriodicNote(periodicity, date, settings, async (newFile) => {
    const { workspace } = window.app;
    const leaf = getLeaf
      ? getLeaf()
      : getLeafForModifierClick(ctrlPressed, settings, workspace);
    await leaf.openFile(newFile, { active: true });
    cb?.(newFile);
  });
}
