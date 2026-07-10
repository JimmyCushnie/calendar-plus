import type { TFile } from "obsidian";
import {
  getAllPeriodicNotes as helperGetAllPeriodicNotes,
  getDateFromFile,
  getDateFromFilename,
  getDateUID,
  isFileInConfiguredFolder,
  isPathInConfiguredFolder,
} from "src/io/periodicNoteHelpers";
import { get, writable } from "svelte/store";

import { defaultSettings } from "src/settings";
import type { ISettings, Periodicity } from "src/settings";

import { getDateUIDFromFile } from "./utils";

function createPeriodicNotesStore(periodicity: Periodicity) {
  let hasError = false;
  const store = writable<Record<string, TFile> | null>(null);
  return {
    reindex: () => {
      const currentSettings = get(settings);
      if (!currentSettings[periodicity].enabled) {
        store.set({});
        hasError = false;
        return;
      }
      try {
        const notes = helperGetAllPeriodicNotes(
          periodicity,
          currentSettings[periodicity]
        );
        store.set(notes);
        hasError = false;
      } catch (err) {
        store.set({});
        if (!hasError) {
          // Avoid error being shown multiple times
          console.log(
            `[Calendar] Failed to find ${periodicity} notes folder`,
            err
          );
        }
        hasError = true;
      }
    },
    // Incremental update for a single newly-created file. No-op when the
    // periodicity is disabled, when the file is outside the configured folder,
    // or when the basename doesn't parse against the configured format.
    // Returns true if the store was mutated.
    addFile: (file: TFile): boolean => {
      const currentSettings = get(settings);
      const periodSettings = currentSettings[periodicity];
      if (!periodSettings.enabled) return false;
      if (!isFileInConfiguredFolder(file, periodSettings)) return false;
      const date = getDateFromFile(file, periodicity, periodSettings.format);
      if (!date) return false;
      const uid = getDateUID(date, periodicity);
      store.update((current) => ({ ...(current ?? {}), [uid]: file }));
      return true;
    },
    // Incremental remove for a single deleted file. Same guards as addFile.
    // Returns true if the UID was actually present in the store.
    removeFile: (file: TFile): boolean => {
      const currentSettings = get(settings);
      const periodSettings = currentSettings[periodicity];
      if (!periodSettings.enabled) return false;
      if (!isFileInConfiguredFolder(file, periodSettings)) return false;
      const date = getDateFromFile(file, periodicity, periodSettings.format);
      if (!date) return false;
      const uid = getDateUID(date, periodicity);
      let removed = false;
      store.update((current) => {
        // Only remove if this exact file owns the UID — two files under a
        // recursively-scanned folder can parse to the same date, and deleting
        // one shouldn't drop the other's entry.
        if (!current || current[uid] !== file) return current;
        removed = true;
        const next = { ...current };
        delete next[uid];
        return next;
      });
      return removed;
    },
    // Remove the entry that the old path mapped to, given the vault `rename`
    // event's `oldPath`. The file's current path/basename already reflect the
    // post-rename state, so we can't derive the old UID from a TFile — we
    // parse the old basename out of `oldPath` directly. Pairs with `addFile`
    // in the rename handler to move dots cleanly.
    removeByOldPath: (oldPath: string, file: TFile): boolean => {
      const currentSettings = get(settings);
      const periodSettings = currentSettings[periodicity];
      if (!periodSettings.enabled) return false;
      if (!isPathInConfiguredFolder(oldPath, periodSettings)) return false;
      const lastSlash = oldPath.lastIndexOf("/");
      const filename = lastSlash >= 0 ? oldPath.substring(lastSlash + 1) : oldPath;
      const oldBasename = filename.endsWith(".md")
        ? filename.substring(0, filename.length - 3)
        : filename;
      const date = getDateFromFilename(
        oldBasename,
        periodicity,
        periodSettings.format
      );
      if (!date) return false;
      const uid = getDateUID(date, periodicity);
      let removed = false;
      store.update((current) => {
        // Only remove if this exact file owns the UID. Compare by identity, NOT
        // by .path: Obsidian mutates TFile.path to the new path *before* firing
        // the rename event, so the stored entry's .path already equals the new
        // path — a .path===oldPath check would never match and would leak a
        // stale dot at the old date. (A different same-date file may hold it.)
        if (!current || current[uid] !== file) return current;
        removed = true;
        const next = { ...current };
        delete next[uid];
        return next;
      });
      return removed;
    },
    ...store,
  };
}

// Exporting the stores
export const settings = writable<ISettings>(defaultSettings);
export const dailyNotes = createPeriodicNotesStore("daily");
export const weeklyNotes = createPeriodicNotesStore("weekly");
export const monthlyNotes = createPeriodicNotesStore("monthly");
export const yearlyNotes = createPeriodicNotesStore("yearly");
export const quarterlyNotes = createPeriodicNotesStore("quarterly");

// Second daily notes: same date granularity as daily, but independent folder/
// format/template. Uses "daily" periodicity for date parsing and UID generation;
// keyed separately from dailyNotes since it is a distinct store object.
function createSecondDailyNotesStore() {
  let hasError = false;
  const store = writable<Record<string, TFile> | null>(null);
  return {
    reindex: () => {
      const { secondDaily } = get(settings);
      if (!secondDaily.enabled) {
        store.set({});
        hasError = false;
        return;
      }
      try {
        store.set(helperGetAllPeriodicNotes("daily", secondDaily));
        hasError = false;
      } catch (err) {
        store.set({});
        if (!hasError) {
          console.log("[Calendar] Failed to find second daily notes folder", err);
        }
        hasError = true;
      }
    },
    addFile: (file: TFile): boolean => {
      const { secondDaily } = get(settings);
      if (!secondDaily.enabled) return false;
      if (!isFileInConfiguredFolder(file, secondDaily)) return false;
      const date = getDateFromFile(file, "daily", secondDaily.format);
      if (!date) return false;
      const uid = getDateUID(date, "daily");
      store.update((current) => ({ ...(current ?? {}), [uid]: file }));
      return true;
    },
    removeFile: (file: TFile): boolean => {
      const { secondDaily } = get(settings);
      if (!secondDaily.enabled) return false;
      if (!isFileInConfiguredFolder(file, secondDaily)) return false;
      const date = getDateFromFile(file, "daily", secondDaily.format);
      if (!date) return false;
      const uid = getDateUID(date, "daily");
      let removed = false;
      store.update((current) => {
        // Only remove if this exact file owns the UID (see periodic store).
        if (!current || current[uid] !== file) return current;
        removed = true;
        const next = { ...current };
        delete next[uid];
        return next;
      });
      return removed;
    },
    removeByOldPath: (oldPath: string, file: TFile): boolean => {
      const { secondDaily } = get(settings);
      if (!secondDaily.enabled) return false;
      if (!isPathInConfiguredFolder(oldPath, secondDaily)) return false;
      const lastSlash = oldPath.lastIndexOf("/");
      const filename = lastSlash >= 0 ? oldPath.substring(lastSlash + 1) : oldPath;
      const oldBasename = filename.endsWith(".md")
        ? filename.substring(0, filename.length - 3)
        : filename;
      const date = getDateFromFilename(oldBasename, "daily", secondDaily.format);
      if (!date) return false;
      const uid = getDateUID(date, "daily");
      let removed = false;
      store.update((current) => {
        // Only remove if this exact file owns the UID (compare by identity —
        // TFile.path is already the new path by the time rename fires; see the
        // periodic store's removeByOldPath for the full rationale).
        if (!current || current[uid] !== file) return current;
        removed = true;
        const next = { ...current };
        delete next[uid];
        return next;
      });
      return removed;
    },
    ...store,
  };
}

export const secondDailyNotes = createSecondDailyNotesStore();

function createSelectedFileStore() {
  const store = writable<string | null>(null);

  return {
    setFile: (file: TFile | null) => {
      const id = file ? getDateUIDFromFile(file, get(settings)) : null;
      store.set(id);
    },
    ...store,
  };
}

export const activeFile = createSelectedFileStore();

// Tracks whether the active file is a *second* daily note, so its day cell can
// show a distinct (grey) highlight. Detection is folder-aware (checks the
// configured second-daily folder + format) rather than relying on
// getDateUIDFromFile, so a second daily note is never mistaken for a primary
// daily note even when the two share a date format.
function createActiveSecondDailyStore() {
  const store = writable<string | null>(null);

  return {
    setFile: (file: TFile | null) => {
      const { secondDaily } = get(settings);
      if (!file || !secondDaily.enabled || !isFileInConfiguredFolder(file, secondDaily)) {
        store.set(null);
        return;
      }
      const date = getDateFromFile(file, "daily", secondDaily.format);
      store.set(date ? getDateUID(date, "daily") : null);
    },
    ...store,
  };
}

export const activeSecondDailyFile = createActiveSecondDailyStore();
