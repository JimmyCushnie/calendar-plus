<svelte:options immutable />

<script lang="ts">
  import type { Moment } from "src/types/moment";
  import { getDateUID } from "src/io/periodicNoteHelpers";

  import Dot from "./Dot.svelte";
  import MetadataResolver from "./MetadataResolver.svelte";
  import type { IDayMetadata } from "../types";
  import { isMetaPressed, isWeekend } from "../utils";

  // Properties
  export let date: Moment;
  export let metadata: Promise<IDayMetadata> | null;
  export let onHover: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => boolean;
  export let onClick: (date: Moment, isMetaPressed: boolean) => boolean;
  export let onContextMenu: (date: Moment, event: MouseEvent) => boolean;

  // Global state
  export let today: Moment;
  export let displayedMonth: Moment = null;
  export let selectedId: string = null;
  export let weekendDays: number[] = [0, 6];

  $: isWeekendDay = isWeekend(date, weekendDays);
</script>

<td class:weekend="{isWeekendDay}">
  <MetadataResolver metadata="{metadata}" let:metadata>
    <div
      class="{`day ${metadata.classes.join(' ')}`}"
      class:active="{selectedId === getDateUID(date, 'daily')}"
      class:adjacent-month="{!date.isSame(displayedMonth, 'month')}"
      class:today="{date.isSame(today, 'day')}"
      class:has-background-image="{!!metadata.backgroundImage}"
      style="{metadata.backgroundImage ? `background-image: url("${metadata.backgroundImage}")` : ''}"
      on:click="{onClick && ((e) => onClick(date, isMetaPressed(e)))}"
      on:contextmenu="{onContextMenu && ((e) => onContextMenu(date, e))}"
      on:pointerover="{onHover &&
        ((e) => onHover(date, e.target, isMetaPressed(e)))}"
      {...metadata.dataAttributes || {}}
    >
      <span class="day-number">{date.format("D")}</span>
      <div class="dot-container">
        {#each metadata.dots as dot}
          <Dot {...dot} />
        {/each}
      </div>
    </div>
  </MetadataResolver>
</td>

<style>
  .day {
    background-color: var(--color-background-day);
    border-radius: 4px;
    color: var(--color-text-day);
    cursor: pointer;
    font-size: 0.8em;
    height: 100%;
    /* isolation: isolate creates a stacking context so ::before/::after
       z-index values are resolved within .day, not the document root.
       This lets z-index: 0 overlays sit above the background image but
       below z-index: 1 text and dots. */
    isolation: isolate;
    padding: 4px;
    position: relative;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
    vertical-align: baseline;
  }
  .day:hover {
    background-color: var(--interactive-hover);
  }

  .day.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  .adjacent-month {
    opacity: 0.25;
  }

  .today {
    color: var(--color-text-today);
  }

  .day:active,
  .day.active,
  .day.active.today {
    color: var(--text-on-accent);
    background-color: var(--interactive-accent);
  }

  /* Feature image support ------------------------------------------------ */

  .day.has-background-image {
    background-size: cover;
    background-position: center;
    overflow: hidden;
  }

  /* Readability overlay: a dark gradient in front of the image so the date
     number and dots are visible regardless of photo content. Kept heavy on
     purpose — the goal is an at-a-glance "this day has an image" cue, not to
     show photo detail. z-index: 0 sits above the background image but below
     .day-number / .dot-container (z-index: 1 within the isolation context). */
  .day.has-background-image::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
    background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.35));
    pointer-events: none;
    z-index: 0;
  }

  /* Active state over an image: suppress the solid accent background and
     use a translucent accent overlay instead so the photo stays visible
     underneath while the cell still reads as selected. */
  .day.has-background-image.active,
  .day.has-background-image.active.today,
  .day.has-background-image:active {
    background-color: transparent;
  }

  .day.has-background-image.active::after,
  .day.has-background-image.active.today::after,
  .day.has-background-image:active::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--interactive-accent);
    border-radius: 4px;
    opacity: 0.65;
    pointer-events: none;
    z-index: 0;
  }

  /* The number is wrapped in a span purely for z-index: it must sit above
     both overlays within the isolation stacking context. No visual styling
     here — color, weight, and the today/active rules all come from the
     existing .day / .today / .day.active.today rules and inherit through the
     span, so the number looks identical whether or not the cell has an image. */
  .day-number {
    position: relative;
    z-index: 1;
  }

  .dot-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    line-height: 6px;
    min-height: 6px;
    position: relative;
    z-index: 1;
  }
</style>
