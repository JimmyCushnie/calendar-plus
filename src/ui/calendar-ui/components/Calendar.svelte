<script lang="ts">
  import { Platform } from "obsidian";

  import { moment } from "src/types/moment";
  import type { Locale, Moment } from "src/types/moment";

  import Day from "./Day.svelte";
  import Nav from "./Nav.svelte";
  import WeekNum from "./WeekNum.svelte";
  import YearGrid from "./YearGrid.svelte";
  import { getDailyMetadata, getWeeklyMetadata } from "../metadata";
  import type { ICalendarSource } from "../types";
  import { getDaysOfWeek, getMonth, isWeekend } from "../utils";

  let {
    // Localization
    localeData,
    // Settings
    showWeekNums = false,
    showWeekNumsRight = false,
    // JS weekday numbers (0 = Sunday … 6 = Saturday) treated as weekend days
    // for the `class:weekend` binding on header and body cells. Independent of
    // week-start ordering.
    weekendDays = [0, 6],
    // Event handlers
    onHoverDay,
    onHoverWeek,
    onContextMenuDay,
    onContextMenuWeek,
    quarterVisible,
    onClickDay,
    onClickWeek,
    onClickMonth,
    onClickYear,
    onClickQuarter,
    onClickToday = undefined,
    showTodayButtonOnMobile = false,
    // Year overview: when true, render the history button in the header that
    // opens the 12-month grid as a popup. `monthsWithNotes` drives the
    // per-month "has any note" dot.
    showYearOverview = false,
    monthsWithNotes = [],
    // External sources (all optional)
    sources = [],
    selectedId,
    // Override-able local state. `displayedMonth` is two-way bound by the
    // wrapper (and pushed imperatively via the wrapper's setDisplayedMonth),
    // so it is $bindable; its default references `today`, hence the ordering.
    today = moment(),
    displayedMonth = $bindable(today),
  }: {
    localeData: Locale;
    showWeekNums?: boolean;
    showWeekNumsRight?: boolean;
    weekendDays?: number[];
    onHoverDay: (date: Moment, targetEl: EventTarget, isMetaPressed: boolean) => void;
    onHoverWeek: (date: Moment, targetEl: EventTarget, isMetaPressed: boolean) => void;
    onContextMenuDay: (date: Moment, event: MouseEvent) => void;
    onContextMenuWeek: (date: Moment, event: MouseEvent) => void;
    quarterVisible: boolean;
    onClickDay: (date: Moment, isMetaPressed: boolean, isAltPressed?: boolean) => void;
    onClickWeek: (date: Moment, isMetaPressed: boolean) => void;
    onClickMonth: (date: Moment, isMetaPressed: boolean) => void;
    onClickYear: (date: Moment, isMetaPressed: boolean) => void;
    onClickQuarter: (date: Moment, isMetaPressed: boolean) => void;
    onClickToday?: (date: Moment) => void;
    showTodayButtonOnMobile?: boolean;
    showYearOverview?: boolean;
    monthsWithNotes?: boolean[];
    sources?: ICalendarSource[];
    selectedId: string | null;
    today?: Moment;
    displayedMonth?: Moment;
  } = $props();

  const isMobile = Platform.isMobile;

  // Year-overview popup open/close is local, transient UI state (not
  // persisted). The history button toggles it; a window click closes it.
  let yearOverviewOpen = $state(false);

  function toggleYearOverview() {
    yearOverviewOpen = !yearOverviewOpen;
  }

  function incrementDisplayedYear() {
    displayedMonth = displayedMonth.clone().add(1, "year");
  }

  function decrementDisplayedYear() {
    displayedMonth = displayedMonth.clone().subtract(1, "year");
  }

  // Clicking a month in the popup navigates the day grid to it and closes.
  function selectMonth(date: Moment) {
    displayedMonth = date;
    yearOverviewOpen = false;
  }

  // getMonth/getDaysOfWeek read moment's global locale; `localeData` (and
  // `today`) are passed as reactivity triggers so these re-derive when the
  // locale / week-start change. See utils.ts.
  const month = $derived(getMonth(displayedMonth, localeData));
  const daysOfWeek = $derived(getDaysOfWeek(today, localeData));

  // Exports
  export function incrementDisplayedMonth() {
    displayedMonth = displayedMonth.clone().add(1, "month");
  }

  export function decrementDisplayedMonth() {
    displayedMonth = displayedMonth.clone().subtract(1, "month");
  }

  export function resetDisplayedMonth() {
    displayedMonth = today.clone();
  }
</script>

<svelte:window
  onclick={() => {
    if (yearOverviewOpen) yearOverviewOpen = false;
  }}
/>

<div id="calendar-container" class="container" class:is-mobile={isMobile}>
  <Nav
    {today}
    {displayedMonth}
    {incrementDisplayedMonth}
    {decrementDisplayedMonth}
    {quarterVisible}
    {onClickMonth}
    {onClickYear}
    {onClickQuarter}
    {onClickToday}
    {showTodayButtonOnMobile}
    showYearOverviewButton={showYearOverview}
    {yearOverviewOpen}
    onToggleYearOverview={toggleYearOverview}
    {resetDisplayedMonth}
  />
  {#if yearOverviewOpen}
    <div class="year-popup" onclick={(e) => e.stopPropagation()}>
      <YearGrid
        {today}
        {displayedMonth}
        {monthsWithNotes}
        onSelectMonth={selectMonth}
        {incrementDisplayedYear}
        {decrementDisplayedYear}
      />
    </div>
  {/if}
  <table class="calendar">
    <colgroup>
      {#if showWeekNums && !showWeekNumsRight}
        <col />
      {/if}
      {#each month[1].days as _date}
        <col />
      {/each}
    </colgroup>
    <thead>
      <tr>
        {#if showWeekNums && !showWeekNumsRight}
          <th class="week-num-heading">W</th>
        {/if}
        {#each daysOfWeek as dayOfWeek, i}
          <th class:weekend="{isWeekend(month[1].days[i], weekendDays)}">{dayOfWeek}</th>
        {/each}
        {#if showWeekNums && showWeekNumsRight}
          <th class="week-num-heading">W</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each month as week (week.weekNum)}
        <tr>
          {#if showWeekNums && !showWeekNumsRight}
            <WeekNum
              {...week}
              metadata={getWeeklyMetadata(sources, week.days[0], today)}
              onClick={onClickWeek}
              onContextMenu={onContextMenuWeek}
              onHover={onHoverWeek}
              {selectedId}
              gridRight={!showWeekNumsRight}
            />
          {/if}
          {#each week.days as day (day.format())}
            <Day
              date={day}
              {today}
              {displayedMonth}
              {weekendDays}
              onClick={onClickDay}
              onContextMenu={onContextMenuDay}
              onHover={onHoverDay}
              metadata={getDailyMetadata(sources, day, today)}
              {selectedId}
            />
          {/each}
          {#if showWeekNums && showWeekNumsRight}
            <WeekNum
              {...week}
              metadata={getWeeklyMetadata(sources, week.days[0], today)}
              onClick={onClickWeek}
              onContextMenu={onContextMenuWeek}
              onHover={onHoverWeek}
              {selectedId}
              gridRight={!showWeekNumsRight}
            />
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .container {
    --color-background-heading: transparent;
    --color-background-day: transparent;
    --color-background-weeknum: transparent;
    --color-background-weekend: var(--color-base-25);

    --color-dot: var(--text-muted);
    --color-arrow: var(--text-muted);
    --color-button: var(--text-muted);

    --color-text-title: var(--text-normal);
    --color-text-heading: var(--text-muted);
    --color-text-day: var(--text-normal);
    --color-text-today: var(--interactive-accent);
    --color-text-weeknum: var(--text-muted);
  }

  .container {
    padding: 0 8px;
    /* Anchor the absolutely-positioned year-overview popup. */
    position: relative;
    user-select: none;
  }

  .container.is-mobile {
    padding: 0;
  }

  /* Year-overview popup: floats over the calendar, anchored under the
     header history button. Click-away closes it (handled in script). */
  .year-popup {
    position: absolute;
    top: 42px;
    right: 8px;
    z-index: 20;
    width: 220px;
    max-width: calc(100% - 16px);
    padding: 8px 10px 10px;
    background-color: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    box-shadow: var(--shadow-s);
  }

  .container.is-mobile .year-popup {
    right: 0;
  }

  th {
    text-align: center;
  }

  .calendar {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
  }

  .week-num-heading {
    width: 10%;
  }

  th {
    background-color: var(--color-background-heading);
    color: var(--color-text-heading);
    font-size: 0.6em;
    letter-spacing: 1px;
    padding: 4px;
    text-transform: uppercase;
  }
</style>
