<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { LEVELS, type Level } from '../lib/types';
  import WordCard from '../components/WordCard.svelte';

  let lvl = $state<'all' | Level>('all');
  let scope = $state<'planted' | 'all'>('planted');
  let nonce = $state(0);
  let i = $state(0);
  let flipped = $state(false);

  const list = $derived.by(() => {
    void nonce;
    const ws = app.words.filter(
      (w) => w.senses?.length && (lvl === 'all' || w.level === lvl) && (scope === 'all' || app.cards[w.id]),
    );
    for (let k = ws.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [ws[k], ws[j]] = [ws[j], ws[k]];
    }
    return ws;
  });
  const w = $derived(list[Math.min(i, list.length - 1)]);

  function reset() {
    i = 0;
    flipped = false;
  }
  function go(d: number) {
    i = (i + d + list.length) % list.length;
    flipped = false;
  }
</script>

<div class="screen stack">
  <div class="panel stack">
    <h2>自由翻卡</h2>
    <p class="soft">隨意翻，不會影響農場的澆水排程。</p>
    <div class="row">
      {#each ['all', ...LEVELS] as l (l)}
        <button class="btn" class:on={lvl === l} onclick={() => ((lvl = l as 'all' | Level), reset())}>{l === 'all' ? '全部' : l}</button>
      {/each}
    </div>
    <div class="row">
      <button class="btn" class:on={scope === 'planted'} onclick={() => ((scope = 'planted'), reset())}>已種下的字</button>
      <button class="btn" class:on={scope === 'all'} onclick={() => ((scope = 'all'), reset())}>所有字</button>
      <button class="btn wood" onclick={() => (nonce++, reset())}>重新洗牌</button>
    </div>
  </div>

  {#if w}
    <div role="button" tabindex="0" class="tap" onclick={() => (flipped = !flipped)} onkeydown={(e) => e.key === 'Enter' && (flipped = !flipped)}>
      <WordCard
        word={w}
        {flipped}
        direction={app.settings.direction}
        hintLang={app.settings.hintLang}
        stage={app.cards[w.id]?.stage ?? 'seed'}
        fresh={!app.cards[w.id]}
      />
    </div>
    <div class="nav">
      <button class="btn wood" onclick={() => go(-1)}>上一張</button>
      <span class="label">{i + 1} / {list.length}</span>
      <button class="btn wood" onclick={() => go(1)}>下一張</button>
    </div>
  {:else}
    <div class="panel">
      <p>{scope === 'planted' ? '這裡還沒有種下的字，先去農場播種，或改選「所有字」。' : '這個等級的內容還在補。'}</p>
    </div>
  {/if}
</div>

<style>
  .tap {
    cursor: pointer;
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>
