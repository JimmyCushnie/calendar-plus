<svelte:options immutable />

<script lang="ts">
  import { onDestroy } from "svelte";

  import CalendarBase from "./calendar-ui/components/Calendar.svelte";
  import { configureGlobalMomentLocale } from "./calendar-ui/localization";
  import type { ICalendarSource } from "./calendar-ui/types";

  import type { ISettings } from "src/settings";
  import { moment } from "src/types/moment";
  import type { Moment } from "src/types/moment";
  import { activeFile, dailyNotes, monthlyNotes, quarterlyNotes, secondDailyNotes, settings, weeklyNotes, yearlyNotes } from "./stores";

  let today: Moment;

  $: today = getToday($settings);

  export let displayedMonth: Moment = today;
  export let sources: ICalendarSource[];
  export let onHoverDay: (date: Moment, targetEl: EventTarget) => boolean;
  export let onHoverWeek: (date: Moment, targetEl: EventTarget) => boolean;
  export let onClickDay: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onClickWeek: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onClickMonth: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onClickYear: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onClickQuarter: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onClickToday: (date: Moment) => void;

  export let onContextMenuDay: (date: Moment, event: MouseEvent) => boolean;
  export let onContextMenuWeek: (date: Moment, event: MouseEvent) => boolean;

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
  />
</div>
