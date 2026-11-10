<script lang="ts">
  import { addDays, daysBetween, formatDayLong } from '../lib/day';
  import { estimate, EXAM_STOP_DAYS, EXAM_WARN_PER_DAY, examDaysLeft, examPerDay } from '../lib/plan';

  let {
    mode = $bindable(),
    perDay = $bindable(),
    examDate = $bindable(),
    examCap = $bindable(),
    remaining,
    today,
  }: {
    mode: 'fixed' | 'exam';
    perDay: number;
    examDate: string | null;
    examCap: number | null;
    remaining: number;
    today: string;
  } = $props();

  const OPTIONS = [5, 10, 15, 20, 30];
  let custom = $state(!OPTIONS.includes(perDay));

  const customEst = $derived(perDay > 0 ? estimate(perDay, remaining, today) : null);
  const daysLeft = $derived(examDate ? examDaysLeft(today, examDate) : 0);
  const examN = $derived(examDate ? examPerDay(remaining, today, examDate) : 0);
  const shown = $derived(examCap ? Math.min(examCap, examN) : examN);
</script>

<div class="stack">
  <div class="row">
    <button class="btn" class:on={mode === 'fixed'} onclick={() => (mode = 'fixed')}>自己選數字</button>
    <button class="btn" class:on={mode === 'exam'} onclick={() => (mode = 'exam')}>我有考試日期</button>
  </div>

  {#if mode === 'fixed'}
    <div class="opts">
      {#each OPTIONS as n (n)}
        {@const e = estimate(n, remaining, today)}
        <button class="btn opt" class:on={!custom && perDay === n} onclick={() => ((perDay = n), (custom = false))}>
          <span>每天 {n} 個</span>
          <span class="sub small">約 {e.minLo}～{e.minHi} 分鐘・{formatDayLong(e.finishDay)}種完</span>
        </button>
      {/each}
      <button class="btn opt" class:on={custom} onclick={() => (custom = true)}><span>自訂</span></button>
    </div>
    {#if custom}
      <label class="row">每天 <input type="number" inputmode="numeric" min="1" max="200" bind:value={perDay} /> 個</label>
      {#if customEst}
        <p class="soft">約 {customEst.minLo}～{customEst.minHi} 分鐘・{formatDayLong(customEst.finishDay)}種完</p>
      {/if}
    {/if}
    <p class="soft">
      每天要翻的卡大約是新字數的 5～10 倍：新字之後還要複習好幾次，所以頭兩三週會覺得輕鬆，之後才會變多。之後隨時可以在設定裡改。
    </p>
  {:else}
    <label class="row">考試日期 <input type="date" min={addDays(today, 1)} bind:value={examDate} /></label>
    {#if examDate}
      {#if daysLeft <= 0}
        <p>離考試 {daysBetween(today, examDate)} 天。考前 {EXAM_STOP_DAYS} 天不種新字，只澆水複習。</p>
      {:else}
        <p>
          離考試 {daysBetween(today, examDate)} 天，{formatDayLong(addDays(examDate, -EXAM_STOP_DAYS))}停止播種（考前 {EXAM_STOP_DAYS} 天只澆水）。
        </p>
        <p>每天要種 <span class="hl">{shown}</span> 個，約 {shown}～{shown * 2} 分鐘。</p>
        {#if examN > EXAM_WARN_PER_DAY}
          <p class="warn">每天超過 {EXAM_WARN_PER_DAY} 個，考前可能種不完。</p>
          <label class="row">
            <input
              type="checkbox"
              checked={examCap != null}
              onchange={(e) => (examCap = e.currentTarget.checked ? EXAM_WARN_PER_DAY : null)}
            />
            設每天上限
            {#if examCap != null}<input type="number" inputmode="numeric" min="1" max="200" bind:value={examCap} /> 個{/if}
          </label>
          {#if examCap != null}<p class="soft">只種到上限，剩下的字考前種不完。</p>{/if}
        {/if}
        <p class="soft">每天會依實際進度重新計算，哪天沒種或多種了，之後幾天會自動調整。</p>
      {/if}
    {/if}
  {/if}
  <p class="soft">還沒種的字：{remaining.toLocaleString()} 個</p>
</div>

<style>
  .opts {
    display: grid;
    gap: calc(var(--u) * 2);
  }
  .opt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .sub {
    opacity: 0.85;
  }
  .hl {
    font-size: var(--fs2);
    color: var(--die);
  }
  .warn {
    color: var(--die);
  }
  input[type='number'] {
    width: 5em;
  }
</style>
