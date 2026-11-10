<script lang="ts">
  import { onMount } from 'svelte';
  import { plain } from '../lib/grammar';
  import { canSpeak, speak } from '../lib/tts';
  import GSentence from './GSentence.svelte';

  /**
   * 答完一律解釋為什麼：語序小標記＋這題的理由。
   * show：排語序題要另外列出正確的句子（四選一的句子在題目上已經補好了）
   */
  let { ok, de, show = false, why, pattern }: { ok: boolean; de: string; show?: boolean; why: string; pattern: string } = $props();

  let el: HTMLDivElement;
  // 捲到看得到解釋的位置，下面留空間給固定在底部的「下一題」
  onMount(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
</script>

<div class="panel explain" class:bad={!ok} aria-live="polite" bind:this={el}>
  <div class="head">
    <h2>{ok ? '答對了！' : show ? '不對喔，正確的是：' : '不對喔'}</h2>
    {#if canSpeak}<button class="btn mini" onclick={() => speak(plain(de))}>唸例句</button>{/if}
  </div>
  {#if show}<p class="plain de"><GSentence {de} /></p>{/if}
  <p class="why"><span class="pat">{pattern}</span></p>
  <p class="plain">{why}</p>
</div>

<style>
  .explain {
    border-color: #a8e07a var(--green) #4f9a3a var(--green);
    scroll-margin-bottom: calc(var(--u) * 30);
  }
  .explain.bad {
    border-color: #f59a84 var(--red) #b8452f var(--red);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(var(--u) * 3);
  }
  h2 {
    margin: 0;
  }
  .mini {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 0 calc(var(--u) * 3);
  }
  .de {
    font-size: calc(var(--fs) * 1.1);
    line-height: 1.7;
    margin: calc(var(--u) * 3) 0 0;
    overflow-wrap: anywhere;
  }
  .why {
    margin: calc(var(--u) * 3) 0 calc(var(--u) * 2);
  }
  p:last-child {
    margin-bottom: 0;
  }
</style>
