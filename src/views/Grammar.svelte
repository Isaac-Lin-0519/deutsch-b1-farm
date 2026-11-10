<script lang="ts">
  import { onMount } from 'svelte';
  import { grammar, grammarQueue, moreGrammar, rateGrammar, unstarted } from '../lib/grammar.svelte';
  import {
    answerOf,
    choiceOptions,
    GRAMMAR_NEW_PER_DAY,
    orderSentence,
    pickExercise,
    randomExercise,
    scrambled,
    shuffled,
    type Exercise,
    type GKind,
    type GPoint,
  } from '../lib/grammar';
  import { isLearning, Rating, type Grade } from '../lib/srs';
  import { app } from '../lib/store.svelte';
  import ChoiceQuiz from '../components/ChoiceQuiz.svelte';
  import Explain from '../components/Explain.svelte';
  import GrammarCard from '../components/GrammarCard.svelte';
  import OrderQuiz from '../components/OrderQuiz.svelte';

  let { onexit, backLabel = '家' }: { onexit: () => void; backLabel?: string } = $props();

  type Item = { id: string; fresh: boolean };
  /** 現在這一題：出題時就定下來，評分後進度變了也不會跟著換 */
  type Cur = { n: number; point: GPoint; fresh: boolean; ex: Exercise; options: string[]; tiles: string[] };

  let queue = $state<Item[]>([]);
  let cur = $state.raw<Cur | null>(null);
  /** 隨意練習：不影響排程 */
  let free = $state(false);
  let total = $state(0);
  let done = $state(0);
  let started = $state(false);
  let flipped = $state(false);
  let busy = $state(false);
  /** 四選一、排語序答完後的結果，按「下一題」才換題 */
  let result = $state<{ ok: boolean; picked: string | null } | null>(null);
  let summary = $state({ n: 0, ok: 0 });
  let serial = 0;

  const reviewLeft = $derived(queue.filter((i) => !i.fresh).length);
  const freshLeft = $derived(queue.filter((i) => i.fresh).length);
  const moreLeft = $derived(unstarted().length);
  const anyStarted = $derived(Object.keys(grammar.recs).length > 0);

  function show() {
    flipped = false;
    result = null;
    const item = queue[0];
    if (!item) return (cur = null);
    const point = grammar.byId.get(item.id)!;
    const ex = free ? randomExercise(point) : pickExercise(point, grammar.recs[item.id]);
    cur = {
      n: ++serial,
      point,
      fresh: item.fresh,
      ex,
      options: ex.kind === 'choice' ? choiceOptions(ex.item) : [],
      tiles: ex.kind === 'order' ? scrambled(ex.item) : [],
    };
  }

  function begin(items: Item[], isFree: boolean) {
    free = isFree;
    queue = items;
    total = items.length;
    done = 0;
    show();
    started = true;
  }

  function loadToday() {
    const { reviews, fresh } = grammarQueue(new Date());
    begin([...reviews.map((r) => ({ id: r.id, fresh: false })), ...fresh.map((p) => ({ id: p.id, fresh: true }))], false);
  }

  onMount(loadToday);

  async function learnMore() {
    await moreGrammar();
    loadToday();
  }

  /** 從學過的文法點隨機出 10 題 */
  function startFree() {
    const ids = Object.keys(grammar.recs);
    const pool = [...shuffled(ids), ...shuffled(ids), ...shuffled(ids)].slice(0, Math.min(10, ids.length * 3));
    summary = { n: 0, ok: 0 };
    begin(
      pool.map((id) => ({ id, fresh: false })),
      true,
    );
  }

  /** 記下這題的結果，並把題目從隊伍裡拿掉（還沒學會的隔三題再出現） */
  async function commit(g: Grade, kind: GKind) {
    const item = queue[0];
    summary.n++;
    if (g >= Rating.Good) summary.ok++;
    const again = free ? g === Rating.Again : isLearning((await rateGrammar(item.id, g, kind)).c);
    const rest = queue.slice(1);
    if (again) rest.splice(Math.min(rest.length, 3), 0, { id: item.id, fresh: false });
    else done++;
    queue = rest;
  }

  async function rateCard(g: Grade) {
    if (busy || !cur) return;
    busy = true;
    try {
      await commit(g, 'card');
      show();
    } finally {
      busy = false;
    }
  }

  async function answered(ok: boolean, picked: string | null, kind: GKind) {
    if (busy || result || !cur) return;
    busy = true;
    result = { ok, picked };
    try {
      await commit(ok ? Rating.Good : Rating.Again, kind);
    } finally {
      busy = false;
    }
  }

  function key(e: KeyboardEvent) {
    if (!cur || busy) return;
    const enter = e.key === 'Enter' || e.key === ' ';
    if (result) {
      if (enter) {
        e.preventDefault();
        show();
      }
    } else if (cur.ex.kind === 'card') {
      if (enter) {
        e.preventDefault();
        flipped = !flipped;
      } else if (flipped && cur.fresh && e.key === '3') void rateCard(Rating.Good);
      else if (flipped && !cur.fresh && e.key === '1') void rateCard(Rating.Again);
      else if (flipped && !cur.fresh && e.key === '2') void rateCard(Rating.Hard);
      else if (flipped && !cur.fresh && e.key === '3') void rateCard(Rating.Good);
    } else if (cur.ex.kind === 'choice' && cur.options[+e.key - 1]) pick(cur.options[+e.key - 1]);
  }

  function pick(o: string) {
    if (cur?.ex.kind === 'choice') void answered(o === answerOf(cur.ex.item.de), o, 'choice');
  }
</script>

<svelte:window onkeydown={key} />

<div class="screen session">
  <div class="bar">
    <button class="btn wood" onclick={onexit}>← {backLabel}</button>
    <span class="label">{free ? `隨意練習 ${done}／${total}` : `複習 ${reviewLeft}・新的 ${freshLeft}`}</span>
  </div>
  <div class="progress"><div style="width:{total ? (done / total) * 100 : 0}%"></div></div>

  {#if cur}
    {#key cur.n}
      {#if cur.ex.kind === 'card'}
        <div
          class="tap"
          role="button"
          tabindex="0"
          aria-label={flipped ? '卡片背面' : '點一下翻面'}
          onclick={() => (flipped = !flipped)}
          onkeydown={() => {}}
        >
          <GrammarCard point={cur.point} {flipped} direction={app.settings.direction} hintLang={app.settings.hintLang} fresh={cur.fresh} />
        </div>
      {:else if cur.ex.kind === 'choice'}
        <ChoiceQuiz
          item={cur.ex.item}
          options={cur.options}
          picked={result ? result.picked : null}
          hintLang={app.settings.hintLang}
          onpick={pick}
        />
      {:else}
        <OrderQuiz item={cur.ex.item} tiles={cur.tiles} hintLang={app.settings.hintLang} onanswer={(ok) => answered(ok, null, 'order')} />
      {/if}
    {/key}

    {#if result && cur.ex.kind !== 'card'}
      <Explain
        ok={result.ok}
        de={cur.ex.kind === 'choice' ? cur.ex.item.de : orderSentence(cur.ex.item)}
        show={cur.ex.kind === 'order'}
        why={cur.ex.item.why}
        pattern={cur.point.pattern}
      />
    {/if}

    <div class="actions">
      {#if cur.ex.kind === 'card'}
        {#if !flipped}
          <button class="btn wood wide" onclick={() => (flipped = true)}>翻面</button>
        {:else if cur.fresh}
          <button class="btn green wide" disabled={busy} onclick={() => rateCard(Rating.Good)}>看懂了，來練習</button>
        {:else}
          <div class="rate">
            <button class="btn red" disabled={busy} onclick={() => rateCard(Rating.Again)}>不會</button>
            <button class="btn yellow" disabled={busy} onclick={() => rateCard(Rating.Hard)}>模糊</button>
            <button class="btn green" disabled={busy} onclick={() => rateCard(Rating.Good)}>記得</button>
          </div>
        {/if}
      {:else if result}
        <button class="btn green wide" disabled={busy} onclick={show}>下一題</button>
      {/if}
    </div>
  {:else if started}
    <div class="panel stack end">
      {#if !grammar.ready}
        <h2>文法內容讀不到</h2>
        <p>請確認網路連線後重新打開 App。</p>
      {:else}
        <h2>{summary.n ? (free ? '練習結束！' : '今天的文法練完了！') : '現在沒有要複習的文法'}</h2>
        {#if summary.n}<p>練了 {summary.n} 題・答對 {summary.ok} 題</p>{/if}
        {#if moreLeft}
          <button class="btn yellow" onclick={learnMore}>再學 {Math.min(GRAMMAR_NEW_PER_DAY, moreLeft)} 個新的</button>
        {:else if !summary.n}
          <p>目前的文法點都學過了，新的內容還在補。</p>
        {/if}
        {#if anyStarted}
          <button class="btn" onclick={startFree}>隨意練習（不影響排程）</button>
        {/if}
      {/if}
      <button class="btn green" onclick={onexit}>回{backLabel}</button>
    </div>
  {/if}
</div>

<style>
  .session {
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
  .tap {
    cursor: pointer;
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
  .end {
    margin-top: 20vh;
    text-align: center;
  }
  .end .btn {
    display: block;
    width: 100%;
  }
</style>
