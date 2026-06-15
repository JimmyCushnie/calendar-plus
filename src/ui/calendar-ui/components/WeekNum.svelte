<svelte:options immutable />

<script lang="ts">
  import type { Moment } from "src/types/moment";
  import { getDateUID } from "src/io/periodicNoteHelpers";

  import Dot from "./Dot.svelte";
  import MetadataResolver from "./MetadataResolver.svelte";
  import type { IDayMetadata } from "../types";
  import { getStartOfWeek, isMetaPressed } from "../utils";

  // Properties
  export let weekNum: number;
  export let days: Moment[];
  export let metadata: Promise<IDayMetadata> | null;
  export let gridRight: boolean;

  // Event handlers
  export let onHover: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean,
  ) => void;
  export let onClick: (date: Moment, isMetaPressed: boolean) => void;
  export let onContextMenu: (date: Moment, event: MouseEvent) => void;

  // Global state;
  export let selectedId: string | null = null;

  let startOfWeek: Moment;
  $: startOfWeek = getStartOfWeek(days);
</script>

<td class:grid-right={gridRight}>
  <MetadataResolver {metadata} let:metadata>
    <div
      class="{`week-num ${(metadata.classes ?? []).join(' ')}`}"
      class:active="{selectedId === getDateUID(days[0], 'weekly')}"
      class:has-background-image="{!!metadata.backgroundImage}"
      style="{metadata.backgroundImage ? `background-image: url("${metadata.backgroundImage}")` : ''}"
      on:click="{onClick && ((e) => onClick(startOfWeek, isMetaPressed(e)))}"
      on:contextmenu="{onContextMenu && ((e) => onContextMenu(days[0], e))}"
      on:pointerover="{onHover &&
        ((e) => onHover(startOfWeek, e.currentTarget, isMetaPressed(e)))}"
    >
      <span class="week-num-number">{weekNum}</span>
      <div class="dot-container">
        {#each metadata.dots ?? [] as dot}
          <Dot {...dot} />
        {/each}
      </div>
    </div>
  </MetadataResolver>
</td>

<style>
  td.grid-right {
    border-right: 1px solid var(--background-modifier-border);
  }

  .week-num {
    background-color: var(--color-background-weeknum);
    border-radius: 4px;
    color: var(--color-text-weeknum);
    cursor: pointer;
    font-size: 0.8em;
    height: 100%;
    isolation: isolate;
    padding: 4px;
    position: relative;
    text-align: center;
    transition:
      background-color 0.1s ease-in,
      color 0.1s ease-in;
    vertical-align: baseline;
  }

  .week-num:hover {
    background-color: var(--interactive-hover);
  }

  .week-num.active {
    color: var(--text-on-accent);
    background-color: var(--interactive-accent);
  }

  .week-num.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  /* Feature image support ------------------------------------------------ */

  .week-num.has-background-image {
    background-size: cover;
    background-position: center;
    overflow: hidden;
  }

  .week-num.has-background-image::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
    background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.35));
    pointer-events: none;
    z-index: 0;
  }

  .week-num.has-background-image.active {
    background-color: transparent;
  }

  .week-num.has-background-image.active::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--interactive-accent);
    border-radius: 4px;
    opacity: 0.65;
    pointer-events: none;
    z-index: 0;
  }

  /* Wrapped purely for z-index (sits above the overlays). No visual styling
     here — the number looks identical whether or not the cell has an image. */
  .week-num-number {
    position: relative;
    z-index: 1;
  }

  /* Reserve consistent space so week numbers don't shift vertically when a
     weekly-note dot appears or disappears. */
  .dot-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    min-height: 6px;
    position: relative;
    z-index: 1;
  }
</style>
