import { Plugin } from "obsidian";
import type { App, WorkspaceLeaf } from "obsidian";

import { VIEW_TYPE_CALENDAR } from "./constants";
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

export default class CalendarPlugin extends Plugin {
  public options!: ISettings;

  async onload(): Promise<void> {
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
    const options = ((await this.loadData()) ?? {}) as Partial<ISettings>;
    settings.update((old) => ({
      ...old,
      ...options,
      // Per-period objects need a one-level merge so a partial saved object
      // (e.g. { enabled: true, format: "YYYY-MM-DD" }) doesn't wipe folder /
      // template defaults from the parent spread above.
      daily:       { ...old.daily,       ...(options.daily       ?? {}) },
      weekly:      { ...old.weekly,      ...(options.weekly      ?? {}) },
      monthly:     { ...old.monthly,     ...(options.monthly     ?? {}) },
      quarterly:   { ...old.quarterly,   ...(options.quarterly   ?? {}) },
      yearly:      { ...old.yearly,      ...(options.yearly      ?? {}) },
      secondDaily:    { ...old.secondDaily,    ...(options.secondDaily    ?? {}) },
      featureImage:   { ...old.featureImage,   ...(options.featureImage   ?? {}) },
    }));

    await this.saveData(this.options);
  }

  async writeOptions(
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> {
    settings.update((old) => ({ ...old, ...changeOpts(old) }));
    await this.saveData(this.options);
  }
}
