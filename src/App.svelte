<script lang="ts">
  import { onMount } from 'svelte';
  import { initGrammar } from './lib/grammar.svelte';
  import { app, init } from './lib/store.svelte';
  import Farm from './views/Farm.svelte';
  import Grammar from './views/Grammar.svelte';
  import Home from './views/Home.svelte';
  import Onboarding from './views/Onboarding.svelte';
  import Practice from './views/Practice.svelte';
  import Review from './views/Review.svelte';
  import Settings from './views/Settings.svelte';
  import Stats from './views/Stats.svelte';

  type View = 'home' | 'farm' | 'review' | 'grammar' | 'practice' | 'stats' | 'settings';
  let view = $state<View>('home');
  /** 澆完水要回到哪裡（從家裡或農場出發） */
  let back = $state<'home' | 'farm'>('home');
  /** 文法練完要回到哪裡（從家裡的黑板或翻卡分頁出發） */
  let backG = $state<'home' | 'practice'>('home');

  // 設定從家裡的齒輪進去
  const TABS: [View, string][] = [
    ['home', '家'],
    ['farm', '農場'],
    ['practice', '翻卡'],
    ['stats', '紀錄'],
  ];

  onMount(async () => {
    await init();
    await initGrammar();
  });

  function go(v: View) {
    view = v;
    window.scrollTo(0, 0);
  }

  function water(from: 'home' | 'farm') {
    back = from;
    go('review');
  }

  function study(from: 'home' | 'practice') {
    backG = from;
    go('grammar');
  }
</script>

<!-- iOS 26 會把狀態列底下的畫面模糊掉；用實色木條蓋住，模糊就看不出來 -->
<div class="topbar" aria-hidden="true"></div>

{#if app.error}
  <div class="screen"><div class="panel"><p>出了點問題：{app.error}</p><button class="btn" onclick={() => location.reload()}>重新載入</button></div></div>
{:else if !app.ready}
  <div class="loading label">載入中…</div>
{:else if !app.settings.onboarded}
  <Onboarding />
{:else if view === 'review'}
  <Review backLabel={back === 'home' ? '家' : '農場'} onexit={() => go(back)} />
{:else if view === 'grammar'}
  <Grammar backLabel={backG === 'home' ? '家' : '翻卡'} onexit={() => go(backG)} />
{:else}
  <div class="shell">
    <main class:fill={view === 'farm' || view === 'home'} class:indoor={view === 'home'}>
      {#if view === 'home'}
        <Home
          onwater={() => water('home')}
          onfarm={() => go('farm')}
          onpractice={() => go('practice')}
          ongrammar={() => study('home')}
          onstats={() => go('stats')}
          onsettings={() => go('settings')}
        />
      {:else if view === 'farm'}
        <Farm onwater={() => water('farm')} onpractice={() => go('practice')} />
      {:else if view === 'practice'}
        <Practice ongrammar={() => study('practice')} />
      {:else if view === 'stats'}
        <Stats />
      {:else}
        <Settings />
      {/if}
    </main>
    <nav>
      {#each TABS as [v, label] (v)}
        <button class="btn" class:on={view === v} onclick={() => go(v)}>{label}</button>
      {/each}
    </nav>
  </div>
{/if}

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    height: env(safe-area-inset-top, 0px);
    background: var(--wood-dk);
    /* 沒有瀏海（桌機）時高度 0，底線也跟著不畫 */
    box-shadow: 0 min(var(--u), env(safe-area-inset-top, 0px)) 0 var(--out);
    pointer-events: none;
  }
  .loading {
    display: grid;
    place-items: center;
    height: 100dvh;
    font-size: var(--fs2);
  }
  .shell {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }
  main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  /* 家裡：房間外圍用深木頭色，不要露出草地 */
  main.indoor {
    background: var(--wood-dk);
  }
  main.fill {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: calc(env(safe-area-inset-top) + 8px) 0 8px;
  }
  nav {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 8px 8px calc(env(safe-area-inset-bottom) + 8px);
    background: var(--wood-dk);
    box-shadow: 0 calc(var(--u) * -1) 0 var(--out);
  }
  nav .btn {
    margin: 0;
    padding: calc(var(--u) * 2) 0;
  }
</style>
