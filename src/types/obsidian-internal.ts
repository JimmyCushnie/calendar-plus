import type { App, TFile } from "obsidian";

// ---------------------------------------------------------------------------
// Typed extensions over Obsidian's undocumented (but stable in practice) APIs.
//
// Each of these surfaces a field that isn't in the public `obsidian.d.ts` but
// has been observably stable across many Obsidian releases. Defining them
// here lets call sites cast through a named interface instead of `any`,
// satisfying the community-plugin review's no-explicit-any rule while still
// acknowledging that these are unofficial.
// ---------------------------------------------------------------------------

/**
 * Extends `App` with the undocumented `foldManager` namespace.
 *
 * `foldManager` preserves the collapsed/expanded state of headings and lists
 * when a file's contents are reseeded from a template. Calendar Plus uses
 * `load` to capture the fold state of a template file and `save` to apply it
 * to a newly-created periodic note so the user sees the same outline shape
 * the template was authored with.
 */
export interface AppWithFold extends App {
  foldManager?: {
    load(f: TFile): unknown;
    save(f: TFile, info: unknown): void;
  };
}

/**
 * Extends `App["fileManager"]` with the undocumented `promptForFileDeletion`.
 *
 * Drives the calendar's right-click context menu "Delete" action so users
 * get the same confirmation flow Obsidian's native file explorer uses.
 */
export interface AppWithDeletePrompt extends App {
  fileManager: App["fileManager"] & {
    promptForFileDeletion(file: TFile): void;
  };
}

/**
 * Shape of the private `_week` member exposed by `moment.localeData()`.
 *
 * Moment doesn't surface `_week` in its public types, but the field has
 * been part of the locale data since 2.x. Calendar Plus reads `dow` to
 * compute the weekday-token offset for template expansion and to remember
 * the bundled locale's week spec for the "Start week on" → Locale default
 * setting.
 */
export interface LocaleDataWithWeek {
  _week: { dow: number };
}
