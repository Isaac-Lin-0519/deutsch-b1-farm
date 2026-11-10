<script lang="ts">
  import { dayKey, daysBetween } from '../lib/day';
  import { app, markTooEasy, relearn, today, word } from '../lib/store.svelte';
  import { canSpeak, sayWord } from '../lib/tts';
  import { STAGE_NAMES } from '../lib/types';
  import Headword from './Headword.svelte';

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  const w = $derived(word(id));
  const rec = $derived(app.cards[id]);
  const nextLabel = $derived.by(() => {
    if (!rec) return '';
    const d = daysBetween(today(), dayKey(rec.c.due));
    return d <= 0 ? '今天' : d === 1 ? '明天' : `${d} 天後`;
  });
  const hint = $derived(w.senses?.[0]);

  async function easy() {
    await markTooEasy(id);
    onclose();
  }

  async function again() {
    if (!confirm(`把「${w.lemma}」退回種子，重新學一次？`)) return;
    await relearn(id);
    onclose();
  }
</script>

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="panel stack sheet" role="dialog" aria-modal="true" aria-label={w.lemma}>
    <Headword word={w} />
    {#if hint}
      <p>{hint.zh}<span class="soft"> ・ {hint.en}</span></p>
    {/if}
    {#if rec}
      <p class="soft">
        {STAGE_NAMES[rec.stage]}・下次澆水：{nextLabel}{rec.wrong ? `・答錯 ${rec.wrong} 次` : ''}
      </p>
    {/if}
    <div class="row">
      {#if canSpeak}<button class="btn" onclick={() => sayWord(w)}>發音</button>{/if}
      {#if rec?.stage !== 'bush'}<button class="btn green" onclick={easy}>太簡單了</button>{/if}
      {#if rec && rec.stage !== 'seed'}<button class="btn yellow" onclick={again}>重新學</button>{/if}
      <button class="btn wood" onclick={onclose}>關閉</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(20 30 10 / 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 12px 12px calc(env(safe-area-inset-bottom) + 12px);
    z-index: 20;
  }
  .sheet {
    width: 100%;
    max-width: 520px;
  }
</style>
