<script lang="ts">
  import { onMount } from 'svelte';
  import * as C from '../lib/collie';
  import * as P from '../lib/pixel';
  import { fitStage } from '../lib/stage';
  import { app, examDaysAway, fruitCount, fruitOf, plotState, todaysQueue, word } from '../lib/store.svelte';
  import type { Level } from '../lib/types';
  import PlotSheet from '../components/PlotSheet.svelte';

  let { onwater, onpractice }: { onwater: () => void; onpractice: () => void } = $props();

  const W = 120;
  const H = 210;
  const PER_PAGE = 12;

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let size = $state({ w: 240, h: 420 });
  let filter = $state<Filter>(savedFilter());
  let page = $state(0);
  let sheet = $state<string | null>(null);

  /** 全部的作物放在同一塊田，上方的標籤只是篩選 */
  type Filter = 'all' | Level;
  const TABS: { key: Filter; label: string; x: number; w: number }[] = [
    { key: 'all', label: '全部', x: 4, w: 21 },
    { key: 'A1', label: 'A1', x: 26, w: 14 },
    { key: 'A2', label: 'A2', x: 41, w: 14 },
    { key: 'B1', label: 'B1', x: 56, w: 14 },
  ];

  function savedFilter(): Filter {
    try {
      const v = localStorage.getItem('farm.filter') ?? localStorage.getItem('farm.level');
      if (v === 'all' || v === 'A1' || v === 'A2' || v === 'B1') return v;
    } catch {}
    return 'all';
  }

  function setFilter(f: Filter) {
    filter = f;
    page = 0;
    try {
      localStorage.setItem('farm.filter', f);
    } catch {}
  }

  const plants = $derived.by(() => {
    const now = app.now;
    return Object.values(app.cards)
      .filter((r) => filter === 'all' || app.byId.get(r.id)?.level === filter)
      .map((r) => ({ r, ...plotState(r, now) }))
      .sort((a, b) => Number(b.dry) - Number(a.dry) || a.r.plantedAt - b.r.plantedAt);
  });
  const pages = $derived(Math.max(1, Math.ceil(plants.length / PER_PAGE)));
  const visible = $derived(plants.slice(page * PER_PAGE, (page + 1) * PER_PAGE));
  const queue = $derived.by(() => {
    void app.cards;
    void app.daily.planted;
    void app.daily.reviewed;
    return todaysQueue(app.now);
  });
  const fruits = $derived(fruitCount());
  const examDays = $derived(examDaysAway());

  $effect(() => {
    if (page > pages - 1) page = pages - 1;
  });

  const plotPos = (i: number) => ({ x: 14 + (i % 3) * 34, y: 68 + Math.floor(i / 3) * 29 });
  const waterLabel = $derived(queue.reviews.length ? '去澆水' : queue.seeds.length ? '去播種' : '自由翻卡');

  function draw() {
    if (!canvas) return;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    P.grass(c, W, H, 7);
    P.flowers(c, [[6, 64, '#fff3b0'], [114, 82, '#f6a5c0'], [3, 141, '#a9c8ff'], [116, 152, '#fff3b0'], [3, 100, '#f6a5c0']]);

    // 上方木牌：今天要澆水幾株、還有幾顆種子
    P.panel(c, 4, 4, 112, 27);
    const water = queue.reviews.length;
    P.ptext(c, '今天要澆水', 18, 17, P.INK);
    P.ptext(c, `${water} 株`, 222, 17, water ? P.RED_INK : P.INK, null, 'right');
    const left2 = examDays === null ? '今天的種子' : examDays >= 0 ? `離考試 ${examDays} 天・種子` : '考試日已過';
    P.ptext(c, left2, 18, 35, P.INK);
    P.ptext(c, `${queue.seeds.length} 顆`, 222, 35, P.INK, null, 'right');

    // 等級分頁與翻頁
    for (const t of TABS) {
      P.tab(c, t.x, 35, t.w, 12, t.key === filter);
      P.ptext(c, t.label, (t.x + t.w / 2) * P.S, 75, t.key === filter ? P.INK : P.LABEL, null, 'center');
    }
    const canPrev = page > 0;
    const canNext = page < pages - 1;
    P.tab(c, 74, 35, 12, 12, false);
    P.arrow(c, 78, 38, 'left', canPrev ? '#fff3b0' : '#6e3c18');
    P.tab(c, 104, 35, 12, 12, false);
    P.arrow(c, 109, 38, 'right', canNext ? '#fff3b0' : '#6e3c18');
    P.ptext(c, `${page + 1}/${pages}`, 190, 75, P.LABEL, P.LABEL_SHADOW, 'center');

    P.fence(c, 49, W);

    // 田
    for (let i = 0; i < PER_PAGE; i++) {
      const { x, y } = plotPos(i);
      const p = visible[i];
      if (!p) {
        P.soil(c, x, y, false, true);
        continue;
      }
      const w = word(p.r.id);
      P.soil(c, x, y, p.dry);
      P.crop(c, p.wilt ? 'wilt' : p.r.stage, x, y, fruitOf(w));
      if (p.dry) P.drop(c, x + 12, y - 5);
      P.ptext(c, P.fit(w.lemma, 66), (x + 8) * P.S, (y + 17) * P.S, P.LABEL, P.LABEL_SHADOW, 'center');
    }
    if (!plants.length) {
      P.panel(c, 12, 100, 96, 34);
      P.ptext(c, filter === 'all' ? '田裡還沒有作物' : `${filter} 還沒有作物`, 120, 214, P.INK, null, 'center');
      P.ptext(c, `按「${waterLabel}」開始`, 120, 234, P.INK, null, 'center');
    }

    // 邊牧、果實籃、去澆水
    P.blit(c, P.cached('tailA', C.TAIL_A, C.DOG_PAL, C.DOG_OUTLINE), 25, 199);
    P.blit(c, P.cached('sit', C.SIT, C.DOG_PAL, C.DOG_OUTLINE), 3, 181);
    P.sprite(c, P.BASKET, 36, 196, P.BPAL, P.OUT);
    P.ptext(c, `×${fruits}`, 96, 388, P.LABEL, P.LABEL_SHADOW);
    P.panel(c, 62, 184, 54, 22);
    P.ptext(c, waterLabel, 178, 383, '#1d3d6b', null, 'center');
  }

  $effect(() => {
    draw();
  });

  function fitCanvas() {
    if (wrap) size = fitStage(wrap);
  }

  onMount(() => {
    const ro = new ResizeObserver(fitCanvas);
    ro.observe(wrap);
    fitCanvas();
    return () => ro.disconnect();
  });

  function water() {
    if (queue.reviews.length || queue.seeds.length) onwater();
    else onpractice();
  }

  const u = $derived(size.w / W);
  const box = (x: number, y: number, w: number, h: number) =>
    `left:${x * u}px;top:${y * u}px;width:${w * u}px;height:${h * u}px`;
</script>

<div class="wrap" bind:this={wrap}>
  <div class="stage" style="width:{size.w}px;height:{size.h}px">
    <canvas bind:this={canvas} width={W * P.S} height={H * P.S} style="width:{size.w}px;height:{size.h}px"></canvas>
    {#each TABS as t (t.key)}
      <button class="hit" style={box(t.x, 35, t.w, 12)} aria-label={t.key === 'all' ? '全部等級' : `只看 ${t.label}`} aria-pressed={t.key === filter} onclick={() => setFilter(t.key)}></button>
    {/each}
    <button class="hit" style={box(72, 33, 16, 16)} aria-label="上一頁" disabled={page === 0} onclick={() => page--}></button>
    <button class="hit" style={box(102, 33, 16, 16)} aria-label="下一頁" disabled={page >= pages - 1} onclick={() => page++}></button>
    {#each visible as p, i (p.r.id)}
      {@const pos = plotPos(i)}
      <button class="hit" style={box(pos.x - 1, pos.y - 6, 18, 31)} aria-label={word(p.r.id).lemma} onclick={() => (sheet = p.r.id)}></button>
    {/each}
    <button class="hit" style={box(62, 184, 54, 22)} aria-label={waterLabel} onclick={water}></button>
  </div>
</div>

{#if sheet}
  <PlotSheet id={sheet} onclose={() => (sheet = null)} />
{/if}


<style>
  .wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage {
    position: relative;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    box-shadow: 0 0 0 3px var(--out);
  }
  .hit {
    position: absolute;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    touch-action: manipulation;
  }
  .hit:disabled {
    cursor: default;
  }
  .hit:focus-visible {
    outline: 3px solid #fff3b0;
  }
</style>
