<svelte:options immutable />

<script lang="ts">
  import { onDestroy } from "svelte";

  import CalendarBase from "./calendar-ui/components/Calendar.svelte";
  import { configureGlobalMomentLocale } from "./calendar-ui/localization";
  import type { ICalendarSource } from "./calendar-ui/types";
  import { getMonthsWithNotes } from "src/io/yearNotes";

  import type { ISettings } from "src/settings";
  import { moment } from "src/types/moment";
  import type { Moment } from "src/types/moment";
  import { activeFile, dailyNotes, monthlyNotes, quarterlyNotes, secondDailyNotes, settings, weeklyNotes, yearlyNotes } from "./stores";

  let today: Moment;

  $: today = getToday($settings);

  // Recomputed when the displayed year changes (via the year-overview arrows,
  // which mutate the bound displayedMonth) or when any note store changes.
  // displayedMonth defaults to `today`, which is assigned reactively and is
  // therefore undefined at prop-init time — fall back so this never throws
  // during the first flush (a throw here blanks the whole calendar).
  $: monthsWithNotes = getMonthsWithNotes(
    (displayedMonth ?? today ?? moment()).year(),
    $dailyNotes,
    $weeklyNotes,
    $monthlyNotes
  );

  export let displayedMonth: Moment = today;
  export let sources: ICalendarSource[];
  export let onHoverDay: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onHoverWeek: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onClickDay: (
    date: Moment,
    isMetaPressed: boolean,
    isAltPressed?: boolean
  ) => void;
  export let onClickWeek: (date: Moment, isMetaPressed: boolean) => void;
  export let onClickMonth: (date: Moment, isMetaPressed: boolean) => void;
  export let onClickYear: (date: Moment, isMetaPressed: boolean) => void;
  export let onClickQuarter: (date: Moment, isMetaPressed: boolean) => void;
  export let onClickToday: (date: Moment) => void;

  export let onContextMenuDay: (date: Moment, event: MouseEvent) => void;
  export let onContextMenuWeek: (date: Moment, event: MouseEvent) => void;

  export function tick() {
    today = moment();
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

  // 1 minute heartbeat to keep `today` reflecting the current day
  let heartbeat = setInterval(() => {
    tick();

    const isViewingCurrentMonth = displayedMonth.isSame(today, "month");
    if (isViewingCurrentMonth) {
      // if it's midnight on the last day of the month, this will
      // update the display to show the new month.
      displayedMonth = today;
    }
  }, 1000 * 60);

  onDestroy(() => {
    clearInterval(heartbeat);
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
