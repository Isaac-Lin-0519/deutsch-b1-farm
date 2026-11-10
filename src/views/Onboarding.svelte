<script lang="ts">
  import { remainingInBag } from '../lib/plan';
  import { app, saveSettings, today } from '../lib/store.svelte';
  import type { SeedBag } from '../lib/types';
  import DogPortrait from '../components/DogPortrait.svelte';
  import PlanPicker from '../components/PlanPicker.svelte';

  let dogName = $state('');
  let bag = $state<SeedBag>('A1+');
  let plan = $state({ mode: 'fixed' as 'fixed' | 'exam', perDay: 10, examDate: null as string | null, examCap: null as number | null });

  const BAGS: [SeedBag, string][] = [
    ['A1+', '從 A1 開始'],
    ['A2+', '從 A2 開始'],
    ['B1', '只種 B1 新字'],
  ];
  const count = (b: SeedBag) => remainingInBag(app.words, b, new Set());
  const valid = $derived(!!dogName.trim() && (plan.mode === 'fixed' ? plan.perDay >= 1 : !!plan.examDate));

  async function start() {
    await saveSettings({
      onboarded: true,
      dogName: dogName.trim(),
      seedBag: bag,
      planMode: plan.mode,
      newPerDay: Math.max(1, Math.round(plan.perDay)),
      examDate: plan.examDate || null,
      examCap: plan.examCap ? Math.max(1, Math.round(plan.examCap)) : null,
    });
  }
</script>

<div class="screen stack">
  <div class="panel stack">
    <h1>單字農場</h1>
    <p>每個德文單字是一株作物。每天澆水（複習）讓它們長大，結了果實就能拿去餵你的邊牧。</p>
  </div>

  <div class="panel stack">
    <h2>幫你的邊牧取名字</h2>
    <div class="row">
      <DogPortrait />
      <input bind:value={dogName} maxlength="10" size="10" placeholder="名字" aria-label="邊牧的名字" />
    </div>
    <p class="soft">牠會在家裡等你。之後可以在設定裡改名字。</p>
  </div>

  <div class="panel stack">
    <h2>從哪裡開始種？</h2>
    <div class="row">
      {#each BAGS as [v, label] (v)}
        <button class="btn" class:on={bag === v} onclick={() => (bag = v)}>{label}</button>
      {/each}
    </div>
    <p class="soft">共 {count(bag).toLocaleString()} 個字，低等級先種。之後隨時可以在設定裡改。</p>
  </div>

  <div class="panel stack">
    <h2>每天要種幾個新字？</h2>
    <PlanPicker
      bind:mode={plan.mode}
      bind:perDay={plan.perDay}
      bind:examDate={plan.examDate}
      bind:examCap={plan.examCap}
      remaining={count(bag)}
      today={today()}
    />
  </div>

  <button class="btn green go" disabled={!valid} onclick={start}>開始種田</button>
  {#if !dogName.trim()}<p class="label center hint">先幫邊牧取個名字</p>{/if}
</div>

<style>
  .center {
    text-align: center;
  }
  .go {
    width: calc(100% - var(--u) * 2);
    margin: calc(var(--u) * 6) var(--u) 0;
    padding: calc(var(--u) * 4);
  }
  .hint {
    margin-top: calc(var(--u) * 5);
  }
</style>
