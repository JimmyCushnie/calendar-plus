<script lang="ts">
  import type { Moment } from "src/types/moment";
  import { Platform } from "obsidian";
  import Arrow from "./Arrow.svelte";
  import { isMetaPressed } from "../utils";
  let {
    displayedMonth,
    today,
    resetDisplayedMonth,
    incrementDisplayedMonth,
    decrementDisplayedMonth,
    quarterVisible,
    onClickMonth,
    onClickYear,
    onClickQuarter,
    // Optional Today-click callback. When provided, the Today button jumps to
    // the current month *and* invokes this with `today` so the parent can open
    // or create today's daily note via the same path day-cell clicks use.
    onClickToday = undefined,
    // Mobile-only opt-in: render the Today button in the mobile header. Off
    // by default to keep the mobile header uncrowded. Desktop always shows
    // the Today button regardless of this prop.
    showTodayButtonOnMobile = false,
    // Year overview: `showYearOverviewButton` gates whether the history button
    // renders (the persisted setting); `yearOverviewOpen` drives its active
    // styling (the transient popup state); `onToggleYearOverview` opens/closes.
    showYearOverviewButton = false,
    yearOverviewOpen = false,
    onToggleYearOverview = undefined,
  }: {
    displayedMonth: Moment;
    today: Moment;
    resetDisplayedMonth: () => void;
    incrementDisplayedMonth: () => void;
    decrementDisplayedMonth: () => void;
    quarterVisible: boolean;
    onClickMonth: (date: Moment, isMetaPressed: boolean) => void;
    onClickYear: (date: Moment, isMetaPressed: boolean) => void;
    onClickQuarter: (date: Moment, isMetaPressed: boolean) => void;
    onClickToday?: (date: Moment) => void;
    showTodayButtonOnMobile?: boolean;
    showYearOverviewButton?: boolean;
    yearOverviewOpen?: boolean;
    onToggleYearOverview?: () => void;
  } = $props();
  // Get the word 'Today' but localized to the current language
  const todayDisplayStr = $derived(today.calendar().split(/\d|\s/)[0]);
  const isMobile = Platform.isMobile;

  // Function to determine the current quarter
  function getCurrentQuarter(month: number): number {
    return Math.floor(month / 3) + 1;
  }
  // Function to get the start of a quarter
  function getStartOfQuarter(year: number, quarter: number): Moment {
    const startMonth = (quarter - 1) * 3; // Calculate the starting month of the quarter
    return displayedMonth.clone().year(year).month(startMonth).startOf("month");
  }
  const currentQuarter = $derived(getCurrentQuarter(displayedMonth.month()));
</script>

<div class="nav" class:is-mobile="{isMobile}">
  <div class="title-container">
    <h3 class="title">
      <span
        class="month"
        onclick={(event) => {
          onClickMonth(displayedMonth, isMetaPressed(event));
        }}>{displayedMonth.format("MMMM")}</span
      >
      <span
        class="year"
        onclick={(event) => {
          onClickYear(displayedMonth, isMetaPressed(event));
        }}>{displayedMonth.format("YYYY")}</span
      >
    </h3>
    {#if quarterVisible}
      <div class="quarters">
        {#each [1, 2, 3, 4] as quarter, index}
          <span
            class="quarter"
            class:active={quarter === currentQuarter}
            onclick={(event) =>
              onClickQuarter(
                getStartOfQuarter(displayedMonth.year(), quarter),
                isMetaPressed(event),
              )}>Q{quarter}</span
          >
          {#if index < 3}
            <span class="divider">•</span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
  <div class="right-nav">
    {#if showYearOverviewButton}
      <div
        class="year-overview-toggle"
        class:active={yearOverviewOpen}
        onclick={(e) => {
          e.stopPropagation();
          onToggleYearOverview?.();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
          <path d="M12 7v5l4 2"></path>
        </svg>
      </div>
    {/if}
    <Arrow direction="left" onClick={decrementDisplayedMonth} />
    {#if !isMobile || showTodayButtonOnMobile}
      <div
        class="reset-button"
        onclick={() => {
          resetDisplayedMonth();
          onClickToday?.(today);
        }}
      >
        {todayDisplayStr}
      </div>
    {/if}
    <Arrow direction="right" onClick={incrementDisplayedMonth} />
  </div>
</div>

<style>
  .nav {
    align-items: center;
    display: flex;
    margin: 0.6em 0 1em;
    padding: 0 8px;
    width: 100%;
  }

  .nav.is-mobile {
    /* Match desktop left padding so the mobile title aligns with the grid. */
    padding: 0 0 0 8px;
  }

  .title-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .title {
    color: var(--color-text-title);
    font-size: 1.5em;
    margin: 0;
  }

  .is-mobile .title {
    font-size: 1.3em;
  }

  .month {
    font-weight: 500;
    text-transform: capitalize;
    cursor: pointer;
  }

  .year {
    color: var(--interactive-accent);
    cursor: pointer;
  }

  .quarters {
    display: flex;
    align-items: center;
    margin-top: 4px;
    /* 2px optical nudge to the right — sits the cluster just inside the
       month title's left edge instead of perfectly flush, which reads
       better at this font size. Not restoring the old per-item margins
       or container padding (those caused the larger 6px indent). */
    margin-left: 2px;
    /* gap replaces per-item horizontal margins + the container's side
       padding. The previous setup gave Q1 a 4px margin-left plus 2px of
       container padding-left, leaving the row visually indented relative
       to the month title (which has margin: 0). Using gap puts the first
       child flush at the container's left edge while preserving the same
       6px spacing between adjacent items (was 4px quarter-margin + 2px
       divider-margin = 6px between each quarter and its divider). */
    gap: 6px;
  }

  .quarter {
    font-size: 0.6em;
    color: var(--text-muted);
    cursor: pointer;
  }

  .quarter.active {
    color: var(--interactive-accent);
    font-weight: bold;
    /* Background / pill defenses against theme overrides (e.g. Minimal)
       live in styles.css with a `#calendar-container` ID prefix — Svelte's
       component-scoped specificity (0,4,0) isn't enough to beat a theme
       targeting generic `.active` with higher specificity. */
  }

  .divider {
    font-size: 0.4em;
    color: var(--text-muted);
  }

  .right-nav {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: auto;
  }

  .reset-button {
    cursor: pointer;
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 1px;
    margin: 0 4px;
    padding: 0 4px;
    text-transform: uppercase;
  }

  .reset-button:hover {
    opacity: 0.7;
  }

  .year-overview-toggle {
    align-items: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    width: 24px;
  }

  .year-overview-toggle:hover {
    opacity: 0.7;
  }

  .is-mobile .year-overview-toggle {
    width: 32px;
  }

  /* Light grey when off, brightening to the normal (white-ish) text color
     when the panel is open, so the icon's state is legible without color. */
  .year-overview-toggle svg {
    color: var(--text-muted);
    height: 15px;
    width: 15px;
  }

  .year-overview-toggle.active svg {
    color: var(--text-normal);
  }
</style>
