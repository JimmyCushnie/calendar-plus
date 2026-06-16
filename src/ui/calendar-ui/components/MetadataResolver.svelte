<script lang="ts">
  import type { Snippet } from "svelte";

  import type { IDayMetadata } from "../types";

  let {
    metadata,
    children,
  }: {
    metadata: Promise<IDayMetadata> | null;
    // Rendered with the resolved metadata. Consumers (Day/WeekNum) provide
    // this as `{#snippet children(metadata)}`.
    children: Snippet<[IDayMetadata]>;
  } = $props();

  // When there's no metadata promise, hand the snippet an empty metadata
  // object rather than null, so consumers always receive a non-null
  // IDayMetadata.
  const emptyMeta: IDayMetadata = { classes: [], dots: [], dataAttributes: {} };
</script>

{#if metadata}
  {#await metadata then resolvedMeta}
    {@render children(resolvedMeta)}
  {/await}
{:else}
  {@render children(emptyMeta)}
{/if}
