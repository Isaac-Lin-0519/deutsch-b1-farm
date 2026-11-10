<script lang="ts">
  let { de }: { de: string } = $props();
  const parts = $derived(
    de
      .split(/(\{[^}]*\})/)
      .filter(Boolean)
      .map((t) => (t.startsWith('{') ? { t: t.slice(1, -1), hl: true } : { t, hl: false })),
  );
</script>

{#each parts as p}{#if p.hl}<mark>{p.t}</mark>{:else}{p.t}{/if}{/each}
