<script lang="ts">
  import { fruitOf } from '../lib/store.svelte';
  import type { Word } from '../lib/types';

  let { word: w, forms = true }: { word: Word; forms?: boolean } = $props();

  const REGION: Record<string, string> = { D: '德國', A: '奧地利', CH: '瑞士' };
  const region = (rs: string[]) => rs.map((r) => REGION[r] ?? r).join('、');

  const kind = $derived(fruitOf(w));
  const lines = $derived.by(() => {
    const out: string[] = [];
    if (w.pos === 'noun') {
      const [pl, see] = (w.plural ?? '').split('→').map((s) => s.trim());
      if (pl) out.push(`複數 die ${pl}`);
      else if (w.number === 'pl') out.push('只有複數');
      if (see) out.push(`同 ${see}`);
    }
    if (w.pos === 'verb') {
      const f = [w.present3, w.praeteritum, w.perfekt].filter(Boolean);
      if (f.length) out.push(f.join(' ・ '));
    }
    if (w.prep) out.push(`＋ ${w.prep}`);
    if (w.variant_of) out.push(`${region(w.variant_of.regions)}說 ${w.variant_of.word}`);
    return out;
  });
</script>

<div class="hw">
  {#if w.pos === 'noun' && w.articles?.length}
    <span class="chip {kind}">{w.articles.join('/')}</span>
  {/if}
  <span class="big">{w.lemma}</span>
  {#if w.regions?.length}<span class="soft">（{region(w.regions)}）</span>{/if}
</div>
{#if forms && lines.length}
  <div class="forms soft">
    {#each lines as l}<div>{l}</div>{/each}
  </div>
{/if}

<style>
  .hw {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--u) * 3);
  }
  .forms {
    margin-top: calc(var(--u) * 2);
  }
</style>
