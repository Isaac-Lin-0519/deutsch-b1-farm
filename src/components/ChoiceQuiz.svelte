<script lang="ts">
  import { answerOf, type ChoiceItem } from '../lib/grammar';
  import type { HintLang } from '../lib/types';
  import GSentence from './GSentence.svelte';

  let {
    item,
    options,
    picked,
    hintLang,
    onpick,
  }: { item: ChoiceItem; options: string[]; picked: string | null; hintLang: HintLang; onpick: (o: string) => void } = $props();

  const answer = $derived(answerOf(item.de));
  /** 選項是整個子句時，一列放一個 */
  const wide = $derived(options.some((o) => o.length > 12));
</script>

<div class="panel">
  <p class="soft">選出正確的</p>
  <p class="plain q"><GSentence de={item.de} blank={picked === null} /></p>
  {#if hintLang !== 'en'}<p class="plain soft">{item.zh}</p>{/if}
  {#if hintLang !== 'zh'}<p class="plain soft">{item.en}</p>{/if}
  <div class="opts" class:wide>
    {#each options as o (o)}
      <button
        class="btn opt"
        class:right={picked !== null && o === answer}
        class:wrong={picked === o && o !== answer}
        disabled={picked !== null}
        onclick={() => onpick(o)}>{o}</button
      >
    {/each}
  </div>
</div>

<style>
  .q {
    font-size: calc(var(--fs) * 1.15);
    line-height: 1.7;
    margin: calc(var(--u) * 3) 0;
    overflow-wrap: anywhere;
  }
  .opts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--u) * 3);
    margin-top: calc(var(--u) * 5);
  }
  .opts.wide {
    grid-template-columns: 1fr;
  }
  .opt {
    font-size: var(--fs);
    padding: calc(var(--u) * 4) calc(var(--u) * 2);
    margin: 0;
    overflow-wrap: anywhere;
  }
  /* 整個子句的選項用清楚的一般字體 */
  .opts.wide .opt {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: auto;
    text-align: left;
    padding: calc(var(--u) * 3) calc(var(--u) * 4);
  }
  .opt.right {
    background: var(--green);
    opacity: 1;
  }
  .opt.wrong {
    background: var(--red);
    color: #fff8ec;
    opacity: 1;
  }
</style>
