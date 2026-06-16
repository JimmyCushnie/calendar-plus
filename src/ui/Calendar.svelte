<script lang="ts">
  import CalendarBase from "./calendar-ui/components/Calendar.svelte";
  import { configureGlobalMomentLocale } from "./calendar-ui/localization";
  import type { ICalendarSource } from "./calendar-ui/types";
  import { getMonthsWithNotes } from "src/io/yearNotes";

  import type { ISettings, PeriodicNoteSettings } from "src/settings";
  import { moment } from "src/types/moment";
  import type { Moment } from "src/types/moment";
  import { activeFile, dailyNotes, monthlyNotes, quarterlyNotes, secondDailyNotes, settings, weeklyNotes, yearlyNotes } from "./stores";

  let {
    sources,
    onHoverDay,
    onHoverWeek,
    onClickDay,
    onClickWeek,
    onClickMonth,
    onClickYear,
    onClickQuarter,
    onClickToday,
    onContextMenuDay,
    onContextMenuWeek,
  }: {
    sources: ICalendarSource[];
    onHoverDay: (date: Moment, targetEl: EventTarget, isMetaPressed: boolean) => void;
    onHoverWeek: (date: Moment, targetEl: EventTarget, isMetaPressed: boolean) => void;
    onClickDay: (date: Moment, isMetaPressed: boolean, isAltPressed?: boolean) => void;
    onClickWeek: (date: Moment, isMetaPressed: boolean) => void;
    onClickMonth: (date: Moment, isMetaPressed: boolean) => void;
    onClickYear: (date: Moment, isMetaPressed: boolean) => void;
    onClickQuarter: (date: Moment, isMetaPressed: boolean) => void;
    onClickToday: (date: Moment) => void;
    onContextMenuDay: (date: Moment, event: MouseEvent) => void;
    onContextMenuWeek: (date: Moment, event: MouseEvent) => void;
  } = $props();

  let today = $state(moment());
  // `displayedMonth` is local per-view UI state (which month the calendar
  // shows). It is two-way bound to CalendarBase (nav arrows / year popup
  // mutate it) and pushed imperatively from the view via setDisplayedMonth.
  // Initialized to the current month (moment(), same instant as `today`); it
  // then diverges as the user navigates, so it intentionally does NOT track
  // `today` reactively.
  let displayedMonth = $state(moment());

  // Settings → locale + store reindex. Side effects, so this lives in
  // $effect.pre (runs before the DOM updates, keeping the legacy `$:`
  // ordering: stores populated before children render). Reindexing is
  // *selective* — a store is only rescanned when its own folder/format/enabled
  // changed (or on first run). Without this, typing a single character in any
  // folder/format settings field rescanned all six note folders on every
  // keystroke, which lagged noticeably on large vaults.
  let prevSettings: ISettings | null = null;
  $effect.pre(() => {
    const s = $settings;
    configureGlobalMomentLocale(s.localeOverride, s.weekStart);
    reindexChangedStores(s, prevSettings);
    prevSettings = s;
    today = moment();
  });

  // Recomputed when the displayed year changes (via the year-overview arrows,
  // which mutate displayedMonth) or when any note store changes.
  const monthsWithNotes = $derived(
    getMonthsWithNotes(
      displayedMonth.year(),
      $dailyNotes,
      $weeklyNotes,
      $monthlyNotes
    )
  );

  // Imperative API exposed to the view (CalendarView) via mount()'s exports.
  export function tick() {
    today = moment();
  }

  // Jump the calendar to a given month — used by the "Reveal active note"
  // command. displayedMonth is per-view local state, so the view drives it
  // through this setter rather than a shared store (see FUTURE_PLANS.md).
  export function setDisplayedMonth(date: Moment) {
    displayedMonth = date;
  }

  // A store only needs rescanning when the inputs that determine its contents
  // change: enabled, folder, or format. (Display-only settings like dotMode or
  // weekendDays don't affect which notes exist; file create/delete/rename are
  // handled incrementally by the vault listeners in view.ts.)
  function periodChanged(
    a: PeriodicNoteSettings,
    b: PeriodicNoteSettings | undefined
  ): boolean {
    return (
      !b || a.enabled !== b.enabled || a.folder !== b.folder || a.format !== b.format
    );
  }

  function reindexChangedStores(s: ISettings, prev: ISettings | null) {
    if (periodChanged(s.daily, prev?.daily)) dailyNotes.reindex();
    if (periodChanged(s.weekly, prev?.weekly)) weeklyNotes.reindex();
    if (periodChanged(s.monthly, prev?.monthly)) monthlyNotes.reindex();
    if (periodChanged(s.yearly, prev?.yearly)) yearlyNotes.reindex();
    if (periodChanged(s.quarterly, prev?.quarterly)) quarterlyNotes.reindex();
    if (periodChanged(s.secondDaily, prev?.secondDaily)) secondDailyNotes.reindex();
  }

  // 1 minute heartbeat to keep `today` reflecting the current day.
  $effect(() => {
    const heartbeat = setInterval(() => {
      tick();

      const isViewingCurrentMonth = displayedMonth.isSame(today, "month");
      if (isViewingCurrentMonth) {
        // if it's midnight on the last day of the month, this will
        // update the display to show the new month.
        displayedMonth = today;
      }
    }, 1000 * 60);

    return () => clearInterval(heartbeat);
  });
</script>

<div
  class="calendar-plus-wrapper"
  class:daily-enabled={$settings.daily.enabled}
  class:monthly-enabled={$settings.monthly.enabled}
  class:quarterly-enabled={$settings.quarterly.enabled}
  class:yearly-enabled={$settings.yearly.enabled}
  class:weekend-shading-enabled={$settings.shadeWeekendColumns}
>
  <CalendarBase
    {sources}
    {today}
    {onHoverDay}
    {onHoverWeek}
    {onContextMenuDay}
    {onContextMenuWeek}
    {onClickDay}
    {onClickWeek}
    {onClickMonth}
    {onClickYear}
    {onClickQuarter}
    {onClickToday}
    bind:displayedMonth
    localeData={{...today.localeData()}}
    selectedId={$activeFile}
    showWeekNums={$settings.weekly.enabled}
    showWeekNumsRight={$settings.showWeeklyNoteRight}
    quarterVisible={$settings.quarterly.enabled}
    weekendDays={$settings.weekendDays}
    showTodayButtonOnMobile={$settings.showTodayButtonOnMobile}
    showYearOverview={$settings.showYearOverview}
    {monthsWithNotes}
  />
</div>
