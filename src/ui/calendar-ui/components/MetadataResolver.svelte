<svelte:options immutable />

<script lang="ts">
  import type { IDayMetadata } from "../types";

  export let metadata: Promise<IDayMetadata> | null;

  // When there's no metadata promise, hand the slot an empty metadata object
  // rather than null, so consumers (Day/WeekNum) always receive a non-null
  // IDayMetadata.
  const emptyMeta: IDayMetadata = { classes: [], dots: [], dataAttributes: {} };
</script>

{#if metadata}
  {#await metadata then resolvedMeta}
    <slot metadata="{resolvedMeta}" />
  {/await}
{:else}
  <slot metadata="{emptyMeta}" />
{/if}
