import { Plugin, normalizePath } from "obsidian";
import type { App, WorkspaceLeaf } from "obsidian";

import { VIEW_TYPE_CALENDAR } from "./constants";
import { initThumbnailCache, teardownThumbnailCache } from "./io/thumbnailCache";
import { settings } from "./ui/stores";
import { CalendarSettingsTab } from "./settings";
import type { ISettings } from "./settings";
import { moment } from "./types/moment";
import type { WeekSpec } from "./types/moment";
import CalendarView from "./view";

declare global {
  interface Window {
    app: App;
    _bundledLocaleWeekSpec: WeekSpec;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge `patch` onto `base`, returning a new object. Plain-object
 * values merge key-by-key at any depth; everything else (primitives, arrays) is
 * replaced wholesale by the patch value, and a patch value of `undefined` is
 * ignored (keeps base).
 *
 * This is the single mechanism behind both default-backfill on load and nested
 * settings writes, replacing a hand-maintained per-key merge. It matters
 * because Calendar Plus has "no migration code" as a product rule, so
 * default-backfill-on-load is the *entire* forward-compat path: a saved blob
 * missing a (possibly deeply) nested field keeps its default without anyone
 * having to remember to add a merge line, and a `writeOptions` caller that
 * returns a partial can't silently drop the sibling fields it didn't mention.
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch === undefined ? base : (patch as T);
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue;
    result[key] = deepMerge(result[key], patchValue);
  }
  return result as T;
}

export default class CalendarPlugin extends Plugin {
  public options!: ISettings;

  async onload(): Promise<void> {
    // Feature-image thumbnails are cached as files in this plugin's folder.
    // Skip init if the manifest has no dir (then the feature falls back to
    // rendering full-resolution images, as before).
    if (this.manifest.dir) {
      initThumbnailCache(
        this.app,
        normalizePath(`${this.manifest.dir}/thumbnail-cache`)
      );
    }

    this.register(
      settings.subscribe((value) => {
        this.options = value;
      })
    );

    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf, this)
    );

    this.addRibbonIcon("calendar-plus", "Open Calendar Plus", () => {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
      if (leaves.length) {
        void this.app.workspace.revealLeaf(leaves[0]);
      } else {
        this.initLeaf();
      }
    });

    this.addCommand({
      id: "show-calendar-view",
      name: "Open view",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length === 0
          );
        }
        this.initLeaf();
      },
    });

    this.addCommand({
      id: "open-weekly-note",
      name: "Open Weekly Note",
      checkCallback: (checking) => {
        if (checking) {
          return this.options.weekly.enabled;
        }
        // Mount the calendar view if needed, then open the weekly note on the
        // freshly-mounted view. Fire-and-forget; no-op if no view can be made.
        void this.ensureCalendarView().then((view) => {
          void view?.openOrCreateWeeklyNote(moment(), false);
        });
      },
    });

    this.addCommand({
      id: "reveal-active-note",
      name: "Reveal active note",
      callback: () => {
        // Don't auto-create — if the user closed the calendar, there's nothing
        // to reveal the note on. Look up the live view fresh each invocation.
        this.getCalendarView()?.revealActiveNote();
      },
    });

    await this.loadOptions();

    this.addSettingTab(new CalendarSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(() => this.initLeaf());
  }

  onunload(): void {
    // Revoke the in-memory thumbnail object URLs (the cached files on disk
    // persist, which is the point).
    teardownThumbnailCache();
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length) {
      return;
    }
    const right = this.app.workspace.getRightLeaf(false);
    if (!right) return;
    void right.setViewState({
      type: VIEW_TYPE_CALENDAR,
    });
  }

  private getCalendarView(): CalendarView | null {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) return null;
    return leaf.view instanceof CalendarView ? leaf.view : null;
  }

  private async ensureCalendarView(): Promise<CalendarView | null> {
    const existing = this.getCalendarView();
    if (existing) return existing;
    const right = this.app.workspace.getRightLeaf(false);
    if (!right) return null;
    await right.setViewState({ type: VIEW_TYPE_CALENDAR });
    return this.getCalendarView();
  }

  async loadOptions(): Promise<void> {
    // Backfill defaults for any missing key at any depth. `deepMerge` replaces
    // the old hand-maintained per-object merge, so a new (even deeply) nested
    // setting can't be wiped by a returning user's saved blob.
    const saved: unknown = (await this.loadData()) ?? {};
    settings.update((defaults) => deepMerge(defaults, saved));

    await this.saveData(this.options);
  }

  async writeOptions(
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> {
    // deepMerge (not a shallow spread) so a change that returns a nested
    // partial — e.g. { featureImage: { enabled: true } } — preserves the
    // object's other fields rather than dropping them.
    settings.update((old) => deepMerge(old, changeOpts(old)));
    await this.saveData(this.options);
  }
}
