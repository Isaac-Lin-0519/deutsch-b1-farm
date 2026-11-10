<script lang="ts">
  import { checkOrder, type OrderItem } from '../lib/grammar';
  import type { HintLang } from '../lib/types';
  import GSentence from './GSentence.svelte';

  let {
    item,
    tiles,
    hintLang,
    onanswer,
  }: { item: OrderItem; tiles: string[]; hintLang: HintLang; onanswer: (ok: boolean) => void } = $props();

  /** 已經排上去的字塊（存 tiles 的位置） */
  let placed = $state<number[]>([]);
  let checked = $state<boolean | null>(null);

  function put(i: number) {
    if (checked === null && !placed.includes(i)) placed = [...placed, i];
  }
  function take(k: number) {
    if (checked === null) placed = placed.filter((_, j) => j !== k);
  }
  function check() {
    if (checked !== null || placed.length < tiles.length) return;
    checked = checkOrder(
      item,
      placed.map((i) => tiles[i]),
    );
    onanswer(checked);
  }
</script>

<div class="panel">
  <p class="soft">點字塊，排出後半句</p>
  {#if hintLang !== 'en'}<p class="plain soft">{item.zh}</p>{/if}
  {#if hintLang !== 'zh'}<p class="plain soft">{item.en}</p>{/if}

  <div class="line plain" class:ok={checked === true} class:bad={checked === false}>
    <span><GSentence de={item.lead} /></span>
    {#each placed as i, k (i)}
      <button class="tile" disabled={checked !== null} aria-label="拿掉 {tiles[i]}" onclick={() => take(k)}>{tiles[i]}</button>
    {/each}
    {#if placed.length < tiles.length}<span class="slot"></span>{/if}
    <span>{item.tail ?? '.'}</span>
  </div>

  {#if checked === null}
    <div class="bank plain">
      {#each tiles as t, i (i)}
        <button class="tile" class:used={placed.includes(i)} disabled={placed.includes(i)} onclick={() => put(i)}>{t}</button>
      {/each}
    </div>
    <button class="btn green check" disabled={placed.length < tiles.length} onclick={check}>檢查</button>
  {/if}
</div>

<style>
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--u) * 2);
    min-height: calc(var(--u) * 30);
    align-content: flex-start;
    margin: calc(var(--u) * 4) 0;
    padding: calc(var(--u) * 3);
    font-size: calc(var(--fs) * 1.1);
    background: var(--paper-hi);
    border: var(--u) solid var(--paper-lo);
  }
  .tile {
    font: inherit;
    color: var(--ink);
    background: #fff;
    border: var(--u) solid var(--out);
    border-radius: 0;
    box-shadow: 0 var(--u) 0 var(--out);
    padding: calc(var(--u) * 2) calc(var(--u) * 3);
    margin-bottom: var(--u);
    cursor: pointer;
    touch-action: manipulation;
  }
  .tile:disabled {
    cursor: default;
  }
  .tile.used {
    visibility: hidden;
  }
  .line.ok .tile {
    background: #c8ecaa;
  }
  .line.bad .tile {
    background: #f6c0b4;
  }
  .slot {
    width: 3em;
    height: 1.8em;
    border-bottom: 2px solid var(--ink);
  }
  .bank {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--u) * 3);
    font-size: calc(var(--fs) * 1.1);
    min-height: calc(var(--u) * 14);
  }
  .check {
    width: 100%;
    margin-top: calc(var(--u) * 5);
    padding: calc(var(--u) * 4);
  }
</style>
