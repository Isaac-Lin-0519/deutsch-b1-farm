<script lang="ts">
  import { groupName, plain, type GPoint } from '../lib/grammar';
  import { canSpeak, speak } from '../lib/tts';
  import type { Direction, HintLang } from '../lib/types';
  import GSentence from './GSentence.svelte';

  let {
    point: p,
    flipped,
    direction,
    hintLang,
    fresh = false,
  }: { point: GPoint; flipped: boolean; direction: Direction; hintLang: HintLang; fresh?: boolean } = $props();

  const showZh = $derived(hintLang !== 'en');
  const showEn = $derived(hintLang !== 'zh');
  const meaning = $derived([showZh ? p.zh : '', showEn ? p.en : ''].filter(Boolean).join(' ・ '));
  /** 「Relativpronomen: Dativ」這種長標題用小一點的字 */
  const size = $derived(p.de.length > 12 ? 'mid' : 'big');
</script>

<div class="card panel">
  <div class="top">
    <span class="soft">{fresh ? '新的文法' : '複習'}・{groupName(p.group)}</span>
    {#if canSpeak && flipped}
      <button
        class="btn speak"
        onclick={(e) => {
          e.stopPropagation();
          speak(plain(p.ex.de));
        }}>唸例句</button
      >
    {/if}
  </div>

  {#if !flipped}
    <div class="front">
      {#if p.forms}
        <!-- 關代、屬格介系詞：看規則的卡片，不分方向 -->
        <div class={size}>{p.de}</div>
        <p class="prompt">{meaning}</p>
        <p class="soft">{p.ask}</p>
      {:else if direction === 'de2x'}
        <div class={size}>{p.de}</div>
        <span class="pat">{p.pattern}</span>
        <p class="soft">是什麼意思？</p>
      {:else}
        <p class="prompt">{meaning}</p>
        <p class="soft">{groupName(p.group)}，德文怎麼說？</p>
      {/if}
      <p class="soft tap">點一下翻面</p>
    </div>
  {:else}
    <div class="back">
      <div class={size}>{p.de}</div>
      <p><span class="pat">{p.pattern}</span></p>
      <p>{meaning}</p>
      {#if p.forms}
        <div class="forms">
          {#each p.forms as [label, form]}
            <span class="soft">{label}</span><span class="plain form">{form}</span>
          {/each}
        </div>
      {/if}
      <p class="rule">{p.rule}</p>
      <div class="sense">
        <p class="plain de"><GSentence de={p.ex.de} /></p>
        {#if showZh}<p class="plain soft">{p.ex.zh}</p>{/if}
        {#if showEn}<p class="plain soft">{p.ex.en}</p>{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .card {
    min-height: 52vh;
    display: flex;
    flex-direction: column;
  }
  .top {
    display: flex;
    align-items: center;
    gap: calc(var(--u) * 3);
    min-height: calc(var(--u) * 11);
    margin-bottom: calc(var(--u) * 4);
  }
  .speak {
    margin-left: auto;
    flex-shrink: 0;
    white-space: nowrap;
    padding: var(--u) calc(var(--u) * 3);
  }
  .front {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: calc(var(--u) * 3);
    overflow-wrap: anywhere;
  }
  .front p {
    margin: 0;
  }
  .mid {
    font-size: calc(var(--fs) * 1.5);
    line-height: 1.3;
  }
  .front .tap {
    margin-top: auto;
  }
  .back {
    overflow-wrap: anywhere;
  }
  .back p {
    margin: calc(var(--u) * 2) 0;
  }
  .forms {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--u) calc(var(--u) * 4);
    align-items: baseline;
    margin: calc(var(--u) * 3) 0;
    padding: calc(var(--u) * 3);
    background: var(--paper-hi);
    border: var(--u) solid var(--paper-lo);
  }
  .form {
    font-weight: 600;
  }
  .sense {
    margin-top: calc(var(--u) * 4);
    padding-top: calc(var(--u) * 4);
    border-top: var(--u) dashed var(--paper-lo);
  }
  .sense p {
    margin: 0 0 calc(var(--u) * 1.5);
  }
  .de {
    color: var(--ink);
    font-size: var(--fs);
  }
</style>
