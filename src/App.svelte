<script lang="ts">
  import { onMount } from 'svelte';
  import { app, init } from './lib/store.svelte';
  import Farm from './views/Farm.svelte';
  import Home from './views/Home.svelte';
  import Onboarding from './views/Onboarding.svelte';
  import Practice from './views/Practice.svelte';
  import Review from './views/Review.svelte';
  import Settings from './views/Settings.svelte';
  import Stats from './views/Stats.svelte';

  type View = 'home' | 'farm' | 'review' | 'practice' | 'stats' | 'settings';
  let view = $state<View>('home');
  /** 澆完水要回到哪裡（從家裡或農場出發） */
  let back = $state<'home' | 'farm'>('home');

  // 設定從家裡的齒輪進去
  const TABS: [View, string][] = [
    ['home', '家'],
    ['farm', '農場'],
    ['practice', '翻卡'],
    ['stats', '紀錄'],
  ];

  onMount(init);

  function go(v: View) {
    view = v;
    window.scrollTo(0, 0);
  }

  function water(from: 'home' | 'farm') {
    back = from;
    go('review');
  }
</script>

{#if app.error}
  <div class="screen"><div class="panel"><p>出了點問題：{app.error}</p><button class="btn" onclick={() => location.reload()}>重新載入</button></div></div>
{:else if !app.ready}
  <div class="loading label">載入中…</div>
{:else if !app.settings.onboarded}
  <Onboarding />
{:else if view === 'review'}
  <Review backLabel={back === 'home' ? '家' : '農場'} onexit={() => go(back)} />
{:else}
  <div class="shell">
    <main class:fill={view === 'farm' || view === 'home'}>
      {#if view === 'home'}
        <Home
          onwater={() => water('home')}
          onfarm={() => go('farm')}
          onpractice={() => go('practice')}
          onstats={() => go('stats')}
          onsettings={() => go('settings')}
        />
      {:else if view === 'farm'}
        <Farm onwater={() => water('farm')} onpractice={() => go('practice')} />
      {:else if view === 'practice'}
        <Practice />
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
