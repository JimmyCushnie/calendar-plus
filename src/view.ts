import type { Moment } from "src/types/moment";
import {
  getDateFromFile as helperGetDateFromFile,
  getPeriodicNote as helperGetPeriodicNote,
} from "src/io/periodicNoteHelpers";
import { Menu, ItemView, TFile } from "obsidian";
import type { TAbstractFile, WorkspaceLeaf } from "obsidian";
import { createClassComponent } from "svelte/legacy";
import { get } from "svelte/store";

import { TRIGGER_ON_OPEN, VIEW_TYPE_CALENDAR } from "src/constants";
import { tryToCreateDailyNote } from "src/io/dailyNotes";
import { tryToCreateWeeklyNote } from "src/io/weeklyNotes";
import { tryToCreateMonthlyNote } from "src/io/monthlyNotes";
import { tryToCreateYearlyNote } from "src/io/yearlyNotes";
import { tryToCreateQuarterlyNote } from "src/io/quarterlyNotes";
import { createPeriodicNote, getLeafForModifierClick } from "src/io/periodicNotes";
import { createConfirmationDialog } from "src/ui/modal";
import type { ISettings } from "src/settings";

import Calendar from "./ui/Calendar.svelte";
import { showFileMenu } from "./ui/fileMenu";
import {
  activeFile,
  dailyNotes,
  weeklyNotes,
  monthlyNotes,
  quarterlyNotes,
  yearlyNotes,
  secondDailyNotes,
  settings,
} from "./ui/stores";
import {
  createFeatureImageSource,
  customTagsSource,
  secondDailyNoteSource,
  streakSource,
  tasksSource,
  wordCountSource,
} from "./ui/sources";

// The vendored Calendar Svelte component, narrowed to the instance surface
// this view actually calls. Under Svelte 5 the component is instantiated via
// `createClassComponent` (svelte/legacy), which returns the legacy class-API
// instance exposing `$set` / `$destroy` and the component's exported
// functions (`tick`). Type-aware tooling resolves `.svelte` imports loosely,
// so we cast the instance to this precise interface.
interface CalendarComponent {
  tick(): void;
  $set(props: Record<string, unknown>): void;
  $destroy(): void;
}

export default class CalendarView extends ItemView {
  private calendar!: CalendarComponent;
  private settings!: ISettings;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);

    this.registerEvent(this.app.vault.on("create", this.onFileCreated));
    this.registerEvent(this.app.vault.on("delete", this.onFileDeleted));
    this.registerEvent(this.app.vault.on("modify", this.onFileModified));
    this.registerEvent(this.app.vault.on("rename", this.onFileRenamed));
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));
    this.registerEvent(this.app.metadataCache.on("changed", this.onMetadataCacheChanged));

    // settings.subscribe fires synchronously on registration, so this.settings
    // is assigned immediately (the `!` declaration above reflects that).
    this.register(
      settings.subscribe((val) => {
        this.settings = val;

        // Refresh the calendar if settings change. tick is a Svelte getter that
        // reads $$.ctx, which is emptied on $destroy — guard against that case.
        if (this.calendar && typeof this.calendar.tick === "function") {
          this.calendar.tick();
        }
      })
    );
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar Plus";
  }

  getIcon(): string {
    return "calendar-plus";
  }

  onClose(): Promise<void> {
    if (this.calendar) {
      this.calendar.$destroy();
    }
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    // Integration point: external plugins can listen for `calendar-plus:open`
    // (TRIGGER_ON_OPEN) to feed in additional sources. wordCountSource and
    // tasksSource self-gate on `dotMode === "word-count-tasks"`, so they have
    // zero cost in the default "exists" mode.
    const sources = [
      customTagsSource,
      streakSource,
      wordCountSource,
      tasksSource,
      secondDailyNoteSource,
      createFeatureImageSource(this.app),
    ];
    this.app.workspace.trigger(TRIGGER_ON_OPEN, sources);

    this.calendar = createClassComponent({
      component: Calendar,
      target: this.contentEl,
      props: {
        onClickDay: this.openOrCreateDailyNote,
        onClickWeek: this.openOrCreateWeeklyNote,
        onClickMonth: this.openOrCreateMonthlyNote,
        onClickYear: this.openOrCreateYearlyNote,
        onClickQuarter: this.openOrCreateQuarterlyNote,
        onClickToday: this.onClickToday,
        onHoverDay: this.onHoverDay,
        onHoverWeek: this.onHoverWeek,
        onContextMenuDay: this.onContextMenuDay,
        onContextMenuWeek: this.onContextMenuWeek,
        sources,
      },
    }) as unknown as CalendarComponent;

    // Initial active-file sync: file-open only catches transitions after
    // the constructor's listener attaches. If a daily/weekly note was
    // already open when this view mounts (e.g. user opens a note, then
    // reveals the calendar sidebar — common on mobile), without this the
    // active highlight stays missing until the user switches files.
    if (this.app.workspace.layoutReady) {
      this.updateActiveFile();
    }
  }

  onHoverDay = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed || !this.settings.daily.enabled) {
      return;
    }
    const format = this.settings.daily.format;
    const note = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  onHoverWeek = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed || !this.settings.weekly.enabled) {
      return;
    }
    const format = this.settings.weekly.format;
    const note = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  onHoverMonth = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed || !this.settings.monthly.enabled) {
      return;
    }
    const format = this.settings.monthly.format;
    const note = helperGetPeriodicNote(date, "monthly", get(monthlyNotes) ?? {});
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  onHoverYear = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed || !this.settings.yearly.enabled) {
      return;
    }
    const format = this.settings.yearly.format;
    const note = helperGetPeriodicNote(date, "yearly", get(yearlyNotes) ?? {});
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  onHoverQuarter = (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void => {
    if (!isMetaPressed || !this.settings.quarterly.enabled) {
      return;
    }
    const format = this.settings.quarterly.format;
    const note = helperGetPeriodicNote(date, "quarterly", get(quarterlyNotes) ?? {});
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      date.format(format),
      note?.path
    );
  };

  private onContextMenuDay = (date: Moment, event: MouseEvent): void => {
    const { secondDaily, daily } = this.settings;
    const position = { x: event.pageX, y: event.pageY };

    if (secondDaily.enabled) {
      const menu = new Menu();
      const primaryNote = daily.enabled
        ? helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {})
        : null;
      const secondNote = helperGetPeriodicNote(date, "daily", get(secondDailyNotes) ?? {});

      // Daily note actions. When the note exists, offer Open + Delete in their
      // own section at the top — mirroring the second daily note's Open/Delete
      // items. When it doesn't, the single "Create Daily Note" stays grouped
      // with the second daily create item below (no divider, same section).
      if (daily.enabled && primaryNote) {
        menu.addItem((item) =>
          item
            .setTitle("Open daily note")
            .setIcon("calendar-days")
            .setSection("calendar-daily")
            .onClick(() => void this.openOrCreateDailyNote(date, false))
        );
        menu.addItem((item) =>
          item
            .setTitle("Delete daily note")
            .setIcon("trash")
            .setSection("calendar-daily")
            .onClick(() => void this.app.fileManager.trashFile(primaryNote))
        );
      } else if (daily.enabled && !primaryNote) {
        menu.addItem((item) =>
          item
            .setTitle("Create daily note")
            .setIcon("calendar-plus")
            .setSection("calendar-actions")
            .onClick(() => void this.openOrCreateDailyNote(date, false))
        );
      }
      menu.addItem((item) =>
        item
          .setTitle(secondNote ? "Open second daily note" : "Create second daily note")
          .setIcon("notebook")
          .setSection("calendar-actions")
          .onClick(() => void this.openOrCreateSecondDailyNote(date, false))
      );
      if (secondNote) {
        menu.addItem((item) =>
          item
            .setTitle("Delete second daily note")
            .setIcon("trash")
            .setSection("calendar-actions")
            .onClick(() => void this.app.fileManager.trashFile(secondNote))
        );
      }
      // If the primary note exists, append its standard file-menu items below.
      if (primaryNote) {
        this.app.workspace.trigger(
          "file-menu",
          menu,
          primaryNote,
          "calendar-context-menu",
          null
        );
      }
      menu.showAtPosition(position);
      return;
    }

    // Fallback: existing behavior when second daily is not enabled.
    if (!daily.enabled) return;
    const note = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    if (!note) return;
    showFileMenu(this.app, note, position);
  };

  private openOrCreateSecondDailyNote = async (
    date: Moment,
    ctrlPressed: boolean
  ): Promise<void> => {
    if (!this.settings.secondDaily.enabled) return;
    const { workspace } = this.app;
    const existingFile = helperGetPeriodicNote(date, "daily", get(secondDailyNotes) ?? {});

    if (!existingFile) {
      const secondDailySettings = this.settings.secondDaily;
      const filename = date.format(secondDailySettings.format);
      const create = async () => {
        const file = await createPeriodicNote("daily", date, secondDailySettings);
        const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
        await leaf.openFile(file, { active: true });
      };
      if (this.settings.shouldConfirmBeforeCreate) {
        createConfirmationDialog({
          cta: "Create",
          onAccept: create,
          text: `File ${filename} does not exist. Would you like to create it?`,
          title: "New Second Daily Note",
        });
      } else {
        await create();
      }
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);
  };

  private onContextMenuWeek = (date: Moment, event: MouseEvent): void => {
    if (!this.settings.weekly.enabled) return;
    const note = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});
    if (!note) {
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onContextMenuMonth = (date: Moment, event: MouseEvent): void => {
    if (!this.settings.monthly.enabled) return;
    const note = helperGetPeriodicNote(date, "monthly", get(monthlyNotes) ?? {});
    if (!note) {
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onContextMenuYear = (date: Moment, event: MouseEvent): void => {
    if (!this.settings.yearly.enabled) return;
    const note = helperGetPeriodicNote(date, "yearly", get(yearlyNotes) ?? {});
    if (!note) {
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onContextMenuQuarter = (date: Moment, event: MouseEvent): void => {
    if (!this.settings.quarterly.enabled) return;
    const note = helperGetPeriodicNote(date, "quarterly", get(quarterlyNotes) ?? {});
    if (!note) {
      return;
    }
    showFileMenu(this.app, note, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  private onFileDeleted = async (file: TAbstractFile): Promise<void> => {
    if (!(file instanceof TFile)) return;
    const changed = [
      dailyNotes.removeFile(file),
      weeklyNotes.removeFile(file),
      monthlyNotes.removeFile(file),
      quarterlyNotes.removeFile(file),
      yearlyNotes.removeFile(file),
      secondDailyNotes.removeFile(file),
    ].some(Boolean);
    if (changed) {
      this.updateActiveFile();
    }
  };

  private onFileModified = async (file: TAbstractFile): Promise<void> => {
    if (!(file instanceof TFile)) return;
    const date =
      (this.settings.daily.enabled ? helperGetDateFromFile(file, "daily", this.settings.daily.format) : null) ||
      (this.settings.weekly.enabled ? helperGetDateFromFile(file, "weekly", this.settings.weekly.format) : null) ||
      (this.settings.monthly.enabled ? helperGetDateFromFile(file, "monthly", this.settings.monthly.format) : null) ||
      (this.settings.quarterly.enabled ? helperGetDateFromFile(file, "quarterly", this.settings.quarterly.format) : null) ||
      (this.settings.yearly.enabled ? helperGetDateFromFile(file, "yearly", this.settings.yearly.format) : null);
    if (date && this.calendar) {
      this.calendar.tick();
    }
  };

  private onFileCreated = (file: TAbstractFile): void => {
    if (!this.app.workspace.layoutReady || !this.calendar) return;
    if (!(file instanceof TFile)) return;
    const changed = [
      dailyNotes.addFile(file),
      weeklyNotes.addFile(file),
      monthlyNotes.addFile(file),
      quarterlyNotes.addFile(file),
      yearlyNotes.addFile(file),
      secondDailyNotes.addFile(file),
    ].some(Boolean);
    if (changed) {
      this.calendar.tick();
    }
  };

  private onFileRenamed = (file: TAbstractFile, oldPath: string): void => {
    if (!this.app.workspace.layoutReady || !this.calendar) return;
    if (!(file instanceof TFile)) return;
    // Remove the entry the old path mapped to, then add the new file. Each
    // call is a no-op if the file doesn't match that periodicity — same
    // gating logic as create/delete, just doubled up for the move.
    const removed = [
      dailyNotes.removeByOldPath(oldPath),
      weeklyNotes.removeByOldPath(oldPath),
      monthlyNotes.removeByOldPath(oldPath),
      quarterlyNotes.removeByOldPath(oldPath),
      yearlyNotes.removeByOldPath(oldPath),
      secondDailyNotes.removeByOldPath(oldPath),
    ].some(Boolean);
    const added = [
      dailyNotes.addFile(file),
      weeklyNotes.addFile(file),
      monthlyNotes.addFile(file),
      quarterlyNotes.addFile(file),
      yearlyNotes.addFile(file),
      secondDailyNotes.addFile(file),
    ].some(Boolean);
    if (removed || added) {
      this.updateActiveFile();
    }
  };

  private onMetadataCacheChanged = (file: TFile): void => {
    if (!this.app.workspace.layoutReady || !this.calendar) return;
    if (!this.settings.featureImage.enabled) return;
    // Re-tick when a daily or weekly note's metadata changes (e.g. the user
    // edits the `banner` frontmatter property). vault.modify fires before the
    // cache updates, so this handler is the reliable post-update trigger for
    // frontmatter-driven feature images.
    const isDaily =
      this.settings.daily.enabled &&
      helperGetDateFromFile(file, "daily", this.settings.daily.format);
    const isWeekly =
      this.settings.weekly.enabled &&
      this.settings.featureImage.showForWeekly &&
      helperGetDateFromFile(file, "weekly", this.settings.weekly.format);
    if (isDaily || isWeekly) {
      this.calendar.tick();
    }
  };

  public onFileOpen = (_file: TFile | null): void => {
    if (this.app.workspace.layoutReady) {
      this.updateActiveFile();
    }
  };

  private updateActiveFile(): void {
    const file = this.app.workspace.getActiveFile();
    activeFile.setFile(file);

    if (this.calendar) {
      this.calendar.tick();
    }
  }

  public revealActiveNote(): void {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    let date = this.settings.daily.enabled
      ? helperGetDateFromFile(file, "daily", this.settings.daily.format)
      : null;
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }

    date = this.settings.weekly.enabled
      ? helperGetDateFromFile(file, "weekly", this.settings.weekly.format)
      : null;
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }

    date = this.settings.monthly.enabled
      ? helperGetDateFromFile(file, "monthly", this.settings.monthly.format)
      : null;
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }

    date = this.settings.quarterly.enabled
      ? helperGetDateFromFile(file, "quarterly", this.settings.quarterly.format)
      : null;
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }

    date = this.settings.yearly.enabled
      ? helperGetDateFromFile(file, "yearly", this.settings.yearly.format)
      : null;
    if (date) {
      this.calendar.$set({ displayedMonth: date });
      return;
    }
  }

  // Today button: jump to the current month (handled by the Calendar
  // component) and, if daily notes are enabled, open or create today's
  // daily note via the same path day-cell clicks use. Plain pane —
  // modifier state isn't passed from the Today control.
  onClickToday = (date: Moment): void => {
    void this.openOrCreateDailyNote(date, false);
  };

  openOrCreateWeeklyNote = async (
    date: Moment,
    ctrlPressed: boolean
  ): Promise<void> => {
    if (!this.settings.weekly.enabled) return;
    const { workspace } = this.app;

    const existingFile = helperGetPeriodicNote(date, "weekly", get(weeklyNotes) ?? {});

    if (!existingFile) {
      void tryToCreateWeeklyNote(date.clone().startOf("week"), ctrlPressed, this.settings, (file) => {
        activeFile.setFile(file);
      });
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);

    // Synchronously update the active-file store so the highlight lands
    // immediately, instead of waiting on workspace.on("file-open") — that
    // event's mobile timing isn't reliable enough to drive the highlight.
    // Matches the original Calendar plugin's pattern and the monthly /
    // quarterly / yearly existing-file paths below.
    activeFile.setFile(existingFile);
  };

  openOrCreateDailyNote = async (
    date: Moment,
    ctrlPressed: boolean,
    altPressed = false
  ): Promise<void> => {
    const { workspace } = this.app;

    // Option/Alt + click is dedicated to the second daily note: open it if one
    // exists, otherwise do nothing (creation stays a right-click action). Falls
    // through to the normal primary-note flow when second daily is disabled, so
    // Alt is a no-op in that case. Second daily notes don't drive the
    // active-file highlight, so we don't call activeFile.setFile here.
    if (altPressed && this.settings.secondDaily.enabled) {
      const second = helperGetPeriodicNote(date, "daily", get(secondDailyNotes) ?? {});
      if (second) {
        const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
        await leaf.openFile(second);
      }
      return;
    }

    if (!this.settings.daily.enabled) return;
    const existingFile = helperGetPeriodicNote(date, "daily", get(dailyNotes) ?? {});
    if (!existingFile) {
      void tryToCreateDailyNote(
        date,
        ctrlPressed,
        this.settings,
        (dailyNote: TFile) => {
          activeFile.setFile(dailyNote);
        }
      );
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);

    // Synchronous active-file update — see note in openOrCreateWeeklyNote.
    activeFile.setFile(existingFile);
  };

  openOrCreateMonthlyNote = async (
    date: Moment,
    ctrlPressed: boolean
  ): Promise<void> => {
    if (!this.settings.monthly.enabled) return;
    const { workspace } = this.app;

    const startOfMonth = date.clone().startOf("month");

    const existingFile = helperGetPeriodicNote(date, "monthly", get(monthlyNotes) ?? {});
    if (!existingFile) {
      void tryToCreateMonthlyNote(
        startOfMonth,
        ctrlPressed,
        this.settings,
        (file) => {
          activeFile.setFile(file);
        }
      );
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);

    activeFile.setFile(existingFile);
    workspace.setActiveLeaf(leaf, { focus: true });
  };

  openOrCreateQuarterlyNote = async (
    date: Moment,
    ctrlPressed: boolean
  ): Promise<void> => {
    if (!this.settings.quarterly.enabled) return;
    const { workspace } = this.app;

    const startOfQuarter = date.clone().startOf("quarter");

    const existingFile = helperGetPeriodicNote(date, "quarterly", get(quarterlyNotes) ?? {});

    if (!existingFile) {
      void tryToCreateQuarterlyNote(
        startOfQuarter,
        ctrlPressed,
        this.settings,
        (file) => {
          activeFile.setFile(file);
        }
      );
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);

    activeFile.setFile(existingFile);
    workspace.setActiveLeaf(leaf, { focus: true });
  };

  openOrCreateYearlyNote = async (
    date: Moment,
    ctrlPressed: boolean
  ): Promise<void> => {
    if (!this.settings.yearly.enabled) return;
    const { workspace } = this.app;

    const startOfYear = date.clone().startOf("year");

    const existingFile = helperGetPeriodicNote(date, "yearly", get(yearlyNotes) ?? {});

    if (!existingFile) {
      void tryToCreateYearlyNote(startOfYear, ctrlPressed, this.settings, (file) => {
        activeFile.setFile(file);
      });
      return;
    }

    const leaf = getLeafForModifierClick(ctrlPressed, this.settings, workspace);
    await leaf.openFile(existingFile);

    activeFile.setFile(existingFile);
    workspace.setActiveLeaf(leaf, { focus: true });
  };
}
