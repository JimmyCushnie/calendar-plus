<script lang="ts">
  import { moment } from "src/types/moment";
  import type { Moment } from "src/types/moment";

  import Arrow from "./Arrow.svelte";
  import Dot from "./Dot.svelte";

  let {
    // Global state
    displayedMonth,
    today,
    monthsWithNotes = [],
    // Event handlers
    onSelectMonth,
    incrementDisplayedYear,
    decrementDisplayedYear,
  }: {
    displayedMonth: Moment;
    today: Moment;
    monthsWithNotes?: boolean[];
    onSelectMonth: (date: Moment) => void;
    incrementDisplayedYear: () => void;
    decrementDisplayedYear: () => void;
  } = $props();

  // Localized short month names, Jan..Dec (index = month number).
  const monthLabels = $derived(moment.monthsShort());
  const displayedYear = $derived(displayedMonth.year());
  const isCurrentYear = $derived(displayedYear === today.year());
</script>

<div class="year-overview">
  <div class="year-nav">
    <Arrow direction="left" onClick={decrementDisplayedYear} />
    <span class="year-label">{displayedYear}</span>
    <Arrow direction="right" onClick={incrementDisplayedYear} />
  </div>

  <div class="months">
    {#each monthLabels as label, i}
      <div
        class="month-cell"
        class:active={i === displayedMonth.month()}
        class:today={isCurrentYear && i === today.month()}
        onclick={() =>
          onSelectMonth(displayedMonth.clone().month(i).startOf("month"))}
      >
        <span class="month-label">{label}</span>
        <div class="dot-container">
          {#if monthsWithNotes[i]}
            <Dot isFilled />
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  /* Rendered inside the year-overview popup card, which supplies the frame
     and padding — so no border/margin here. */
  .year-overview {
    user-select: none;
  }

  .year-nav {
    align-items: center;
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .year-label {
    color: var(--color-text-title);
    font-size: 0.95em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    min-width: 3em;
    text-align: center;
  }

  .months {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }

  /* Mirror .day styling (compact) so month cells feel like day cells. */
  .month-cell {
    align-items: center;
    background-color: var(--color-background-day);
    border-radius: 4px;
    color: var(--color-text-day);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 5px 4px 3px;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
  }

  .month-cell:hover {
    background-color: var(--interactive-hover);
  }

  .month-cell.today {
    color: var(--color-text-today);
  }

  .month-cell.active {
    color: var(--text-on-accent);
    background-color: var(--interactive-accent);
  }

  .month-cell.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  .month-label {
    font-size: 0.8em;
    text-transform: capitalize;
  }

  /* Reserve space so the row height doesn't shift when a dot appears. */
  .dot-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    line-height: 6px;
    min-height: 6px;
    margin-top: 2px;
  }
</style>
