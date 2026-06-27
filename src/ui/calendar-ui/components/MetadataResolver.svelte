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

  // Resolve the metadata promise into reactive state and render it directly,
  // rather than via `{#await}`. The parent produces a *new* metadata promise on
  // every calendar tick (settings change, file event, sync, heartbeat, …), and
  // `{#await}` tears down and recreates its rendered content each time it's
  // handed a new promise. For feature-image cells that meant the background
  // `<div>` was destroyed and recreated on every tick — forcing the browser to
  // reload and recomposite the image, a major source of lag while typing or
  // syncing with feature images enabled. Resolving into `$state` and rendering
  // it once lets Svelte diff the cell's attributes in place: when the resolved
  // values are unchanged (same dots, same image URL), the DOM — and the image —
  // is left untouched. It also avoids the blank flash `{#await}` showed while a
  // new promise was pending (the previous value stays until the next resolves).
  let resolved = $state<IDayMetadata>(emptyMeta);

  $effect(() => {
    const pending = metadata;
    if (!pending) {
      resolved = emptyMeta;
      return;
    }
    let cancelled = false;
    void pending.then((meta) => {
      if (!cancelled) resolved = meta;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

{@render children(resolved)}
