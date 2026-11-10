<script lang="ts">
  import { fruitOf } from '../lib/store.svelte';
  import { canSpeak, plainExample, sayWord, speak } from '../lib/tts';
  import { STAGE_NAMES, type Direction, type HintLang, type Stage, type Word } from '../lib/types';
  import Example from './Example.svelte';
  import Headword from './Headword.svelte';
  import PlantIcon from './PlantIcon.svelte';

  let {
    word: w,
    flipped,
    direction,
    hintLang,
    stage,
    fresh = false,
  }: { word: Word; flipped: boolean; direction: Direction; hintLang: HintLang; stage: Stage; fresh?: boolean } = $props();

  const POS: Record<string, string> = { noun: '名詞', verb: '動詞' };
  const senses = $derived(w.senses ?? []);
  const showZh = $derived(hintLang !== 'en');
  const showEn = $derived(hintLang !== 'zh');
  const meaning = (s: { zh: string; en: string }) => [showZh ? s.zh : '', showEn ? s.en : ''].filter(Boolean).join(' ・ ');

  function sayIt(e: Event) {
    e.stopPropagation();
    sayWord(w);
  }
</script>

<div class="card panel">
  <div class="top">
    <PlantIcon {stage} fruit={fruitOf(w)} />
    <span class="soft">{fresh ? '新種子' : STAGE_NAMES[stage]}{POS[w.pos] ? `・${POS[w.pos]}` : ''}・{w.level}</span>
    {#if canSpeak && (flipped || direction === 'de2x')}
      <button class="btn speak" onclick={sayIt} aria-label="發音">發音</button>
    {/if}
  </div>

  {#if !flipped}
    <div class="front">
      {#if direction === 'de2x'}
        <div class="big">{w.lemma}</div>
        {#if w.pos === 'noun'}<p class="soft">先想想冠詞是什麼</p>{/if}
      {:else}
        {#each senses as s}<p class="prompt">{meaning(s)}</p>{/each}
        <p class="soft">{w.pos === 'noun' ? '德文怎麼說？連冠詞一起想' : '德文怎麼說？'}</p>
      {/if}
      <p class="soft tap">點一下翻面</p>
    </div>
  {:else}
    <div class="back">
      <Headword word={w} />
      {#each senses as s, i}
        <div class="sense">
          <p>{senses.length > 1 ? `${i + 1}. ` : ''}{meaning(s)}</p>
          <p class="plain de"><Example de={s.ex.de} /></p>
          {#if showZh}<p class="plain soft">{s.ex.zh}</p>{/if}
          {#if showEn}<p class="plain soft">{s.ex.en}</p>{/if}
          {#if canSpeak}
            <button
              class="btn mini"
              onclick={(e) => {
                e.stopPropagation();
                speak(plainExample(s.ex.de));
              }}>唸例句</button
            >
          {/if}
        </div>
      {/each}
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
    margin-bottom: calc(var(--u) * 4);
  }
  .speak {
    margin-left: auto;
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
  .prompt {
    margin: 0;
  }
  .tap {
    margin-top: auto;
  }
  .back {
    overflow-wrap: anywhere;
  }
  .sense {
    margin-top: calc(var(--u) * 5);
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
  .mini {
    padding: 0 calc(var(--u) * 3);
    margin-top: var(--u);
  }
</style>
