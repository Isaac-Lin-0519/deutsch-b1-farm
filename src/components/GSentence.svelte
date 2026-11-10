<script lang="ts">
  import { segments } from '../lib/grammar';

  /** blank：還沒作答，重點挖空、動詞也先不標顏色 */
  let { de, blank = false }: { de: string; blank?: boolean } = $props();
  const parts = $derived(segments(de));
</script>

{#each parts as p}{#if p.k === 'key'}{#if blank}<span class="blank" role="img" aria-label="空格"></span>{:else}<mark>{p.t}</mark>{/if}{:else if p.k === 'verb' && !blank}<span class="verb">{p.t}</span>{:else}{p.t}{/if}{/each}

<style>
  .blank {
    display: inline-block;
    width: 3.2em;
    height: 1em;
    margin: 0 2px;
    border-bottom: 2px solid var(--ink);
    vertical-align: baseline;
  }
</style>
