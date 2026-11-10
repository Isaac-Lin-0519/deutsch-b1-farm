<script lang="ts">
  import { onMount } from 'svelte';
  import { app, markTooEasy, rate, todaysQueue, word } from '../lib/store.svelte';
  import { isLearning, Rating, type Grade } from '../lib/srs';
  import { sayWord } from '../lib/tts';
  import type { FruitKind } from '../lib/types';
  import WordCard from '../components/WordCard.svelte';

  let { onexit, backLabel = '農場' }: { onexit: () => void; backLabel?: string } = $props();

  type Item = { id: string; fresh: boolean };
  let queue = $state<Item[]>([]);
  let total = $state(0);
  let done = $state(0);
  let flipped = $state(false);
  let busy = $state(false);
  let started = $state(false);
  let summary = $state({ watered: 0, planted: 0, fruits: 0 });
  let pop = $state<FruitKind | null>(null);
  const seen = new Set<string>();

  const current = $derived(queue[0]);
  const w = $derived(current ? word(current.id) : null);
  const rec = $derived(current ? app.cards[current.id] : undefined);
  const waterLeft = $derived(queue.filter((i) => !i.fresh).length);
  const seedLeft = $derived(queue.filter((i) => i.fresh).length);

  onMount(() => {
    const { reviews, seeds } = todaysQueue(new Date());
    queue = [...reviews.map((r) => ({ id: r.id, fresh: false })), ...seeds.map((s) => ({ id: s.id, fresh: true }))];
    total = queue.length;
    started = true;
  });

  $effect(() => {
    if (w && app.settings.autoSpeak && app.settings.direction === 'de2x') sayWord(w);
  });

  function count(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    if (item.fresh) summary.planted++;
    else summary.watered++;
  }

  async function answer(g: Grade) {
    if (busy || !current) return;
    busy = true;
    const item = current;
    try {
      const { rec, fruit } = await rate(item.id, g);
      count(item);
      if (fruit) {
        summary.fruits++;
        pop = fruit;
        setTimeout(() => (pop = null), 1000);
      }
      const rest = queue.slice(1);
      // 還在學習中的字，隔三張再出現一次
      if (isLearning(rec.c)) rest.splice(Math.min(rest.length, 3), 0, { id: item.id, fresh: false });
      else done++;
      queue = rest;
      flipped = false;
    } finally {
      busy = false;
    }
  }

  async function tooEasy() {
    if (busy || !current) return;
    busy = true;
    const item = current;
    try {
      await markTooEasy(item.id);
      count(item);
      queue = queue.filter((i) => i.id !== item.id);
      done++;
      flipped = false;
    } finally {
      busy = false;
    }
  }

  // 卡片：點一下翻面；翻面後右滑記得、左滑不會
  let dx = $state(0);
  let startX = 0;
  let dragging = false;
  let moved = false;

  function down(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    const d = e.clientX - startX;
    if (Math.abs(d) > 10) moved = true;
    if (flipped) dx = d;
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    const d = dx;
    dx = 0;
    if (!moved) flipped = !flipped;
    else if (flipped && d > 90) void answer(Rating.Good);
    else if (flipped && d < -90) void answer(Rating.Again);
  }

  function key(e: KeyboardEvent) {
    if (!current) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipped = !flipped;
    } else if (flipped && e.key === '1') void answer(Rating.Again);
    else if (flipped && e.key === '2') void answer(Rating.Hard);
    else if (flipped && e.key === '3') void answer(Rating.Good);
  }
</script>

<svelte:window onkeydown={key} />

<div class="screen review">
  <div class="bar">
    <button class="btn wood" onclick={onexit}>← {backLabel}</button>
    <span class="label">澆水 {waterLeft}・種子 {seedLeft}</span>
  </div>
  <div class="progress"><div style="width:{total ? (done / total) * 100 : 0}%"></div></div>

  {#if w && current}
    {#key current.id + (rec?.c.reps ?? 0)}
      <div
        class="cardwrap"
        style="transform: translateX({dx}px) rotate({dx / 40}deg)"
        class:right={dx > 90}
        class:left={dx < -90}
        role="button"
        tabindex="0"
        aria-label={flipped ? '卡片背面' : '點一下翻面'}
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={() => ((dragging = false), (dx = 0))}
      >
        <WordCard
          word={w}
          {flipped}
          direction={app.settings.direction}
          hintLang={app.settings.hintLang}
          stage={rec?.stage ?? 'seed'}
          fresh={!rec}
        />
      </div>
    {/key}

    <div class="actions">
      {#if !flipped}
        <button class="btn wood wide" onclick={() => (flipped = true)}>翻面</button>
      {:else}
        <div class="rate">
          <button class="btn red" disabled={busy} onclick={() => answer(Rating.Again)}>不會</button>
          <button class="btn yellow" disabled={busy} onclick={() => answer(Rating.Hard)}>模糊</button>
          <button class="btn green" disabled={busy} onclick={() => answer(Rating.Good)}>記得</button>
        </div>
        {#if rec?.stage !== 'bush'}
          <button class="link label" disabled={busy} onclick={tooEasy}>太簡單了，直接結果</button>
        {/if}
      {/if}
    </div>
  {:else if started}
    <div class="panel stack end">
      <h2>{total ? '今天的田照顧好了！' : '現在沒有要澆水的作物'}</h2>
      {#if total}
        <p>澆水 {summary.watered} 株・新種 {summary.planted} 顆・收成 {summary.fruits} 顆果實</p>
      {:else}
        <p>今天的種子也種完了。想多練習可以去「翻卡」。</p>
      {/if}
      <button class="btn green" onclick={onexit}>回{backLabel}</button>
    </div>
  {/if}

  {#if pop}
    <div class="pop label" aria-live="polite">收成 +1 顆果實</div>
  {/if}
</div>

<style>
  .review {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding-bottom: calc(env(safe-area-inset-bottom) + var(--u) * 4);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(var(--u) * 3);
  }
  .progress {
    height: calc(var(--u) * 3);
    margin: calc(var(--u) * 3) var(--u) calc(var(--u) * 4);
    background: var(--grass-dk);
    box-shadow: 0 0 0 var(--u) var(--out);
  }
  .progress div {
    height: 100%;
    background: #9ad35a;
    transition: width 0.2s steps(4);
  }
  .cardwrap {
    touch-action: pan-y;
    cursor: pointer;
    transition: transform 0.08s;
  }
  .cardwrap.right :global(.card) {
    outline: calc(var(--u) * 2) solid var(--green);
  }
  .cardwrap.left :global(.card) {
    outline: calc(var(--u) * 2) solid var(--red);
  }
  .actions {
    position: sticky;
    bottom: 0;
    margin-top: auto;
    padding-top: calc(var(--u) * 4);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: calc(var(--u) * 3);
  }
  .wide {
    width: 100%;
    padding: calc(var(--u) * 4);
  }
  .rate {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: calc(var(--u) * 3);
  }
  .rate .btn {
    padding: calc(var(--u) * 4) 0;
  }
  .link {
    font: inherit;
    background: none;
    border: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .end {
    margin-top: 20vh;
    text-align: center;
  }
  .pop {
    position: fixed;
    left: 50%;
    top: 30%;
    transform: translateX(-50%);
    font-size: var(--fs2);
    animation: rise 1s steps(6) forwards;
    pointer-events: none;
  }
  @keyframes rise {
    to {
      transform: translate(-50%, -40px);
      opacity: 0;
    }
  }
</style>
