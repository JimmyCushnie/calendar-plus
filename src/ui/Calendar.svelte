<script lang="ts">
  import CalendarBase from "./calendar-ui/components/Calendar.svelte";
  import { configureGlobalMomentLocale } from "./calendar-ui/localization";
  import type { ICalendarSource } from "./calendar-ui/types";
  import { getMonthsWithNotes } from "src/io/yearNotes";

  import type { ISettings } from "src/settings";
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

  // getToday has side effects (configure locale + reindex the note stores),
  // so it lives in $effect.pre — which runs before the DOM updates, keeping
  // the legacy `$:` ordering (stores populated before children render).
  $effect.pre(() => {
    today = getToday($settings);
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

  function getToday(settings: ISettings) {
    configureGlobalMomentLocale(settings.localeOverride, settings.weekStart);
    dailyNotes.reindex();
    weeklyNotes.reindex();
    monthlyNotes.reindex();
    yearlyNotes.reindex();
    quarterlyNotes.reindex();
    secondDailyNotes.reindex();
    return moment();
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
