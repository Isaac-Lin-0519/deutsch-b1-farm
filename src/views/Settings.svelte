<script lang="ts">
  import { exportAll, importAll, type Backup } from '../lib/db';
  import { remainingInBag } from '../lib/plan';
  import { app, plantedSet, saveSettings, today } from '../lib/store.svelte';
  import type { Direction, HintLang, Pace } from '../lib/types';
  import { FEED_GAIN, FEED_PER_DAY, hearts, MAX_HEARTS, PET_GAIN, PET_PER_DAY, toNextHeart, TRICKS, WATER_GAIN } from '../lib/affection';
  import { BUILD, checkForUpdate } from '../lib/pwa';
  import DogPortrait from '../components/DogPortrait.svelte';
  import SeedPrefs from '../components/SeedPrefs.svelte';
  import PlanPicker from '../components/PlanPicker.svelte';

  const s = app.settings;
  let plan = $state({ mode: s.planMode, perDay: s.newPerDay, examDate: s.examDate, examCap: s.examCap });
  let saved = $state(false);
  let dogName = $state(s.dogName);
  const heartN = $derived(hearts(app.profile.affection));
  const toNext = $derived(toNextHeart(app.profile.affection));

  let updateMsg = $state('');
  let checking = $state(false);
  async function update() {
    checking = true;
    updateMsg = '檢查中…';
    const r = await checkForUpdate();
    checking = false;
    if (r === 'unsupported') return location.reload(); // 沒有離線功能時，重新載入就是最新版
    updateMsg = { latest: '已經是最新版了', updating: '找到新版，更新完會自動重新開啟…', offline: '沒有連上網路，連上再試一次' }[r];
    if (r === 'updating') checking = true;
  }

  function saveName() {
    const n = dogName.trim();
    if (n && n !== app.settings.dogName) void saveSettings({ dogName: n });
    else dogName = app.settings.dogName;
  }

  const remaining = $derived(remainingInBag(app.words, app.settings.levels, plantedSet(), app.settings.regions));
  const planValid = $derived(plan.mode === 'fixed' ? plan.perDay >= 1 : !!plan.examDate);
  const planChanged = $derived(
    plan.mode !== app.settings.planMode ||
      plan.perDay !== app.settings.newPerDay ||
      (plan.examDate || null) !== app.settings.examDate ||
      plan.examCap !== app.settings.examCap,
  );

  async function applyPlan() {
    await saveSettings({
      planMode: plan.mode,
      newPerDay: Math.max(1, Math.round(plan.perDay)),
      examDate: plan.examDate || null,
      examCap: plan.examCap ? Math.max(1, Math.round(plan.examCap)) : null,
    });
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }

  const PACES: [Pace, string, string][] = [
    ['easy', '輕鬆', '複習少，比較容易忘'],
    ['standard', '標準', '大約記得九成'],
    ['sprint', '衝刺', '複習多，記得最牢'],
  ];
  const DIRS: [Direction, string][] = [
    ['de2x', '德文 → 意思'],
    ['x2de', '意思 → 德文'],
  ];
  const HINTS: [HintLang, string][] = [
    ['zh', '中文'],
    ['en', '英文'],
    ['both', '兩者'],
  ];

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `b1-farm-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  let fileInput: HTMLInputElement;
  async function doImport(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as Backup;
      // 上一版匯出的備份沒有文法進度，匯入時目前的文法進度會留著
      const gram = Array.isArray(data.grammar)
        ? `和 ${data.grammar.length} 個文法點的進度，會取代目前所有進度。`
        : '的進度，會取代目前的單字進度。\n這份備份沒有文法進度，目前的文法進度會保留。';
      if (!confirm(`匯入 ${data.cards?.length ?? 0} 株作物${gram}確定嗎？`)) return;
      await importAll(data);
      location.reload();
    } catch (err) {
      alert(`匯入失敗：${err instanceof Error ? err.message : err}`);
    } finally {
      fileInput.value = '';
    }
  }
</script>

<div class="screen stack">
  <div class="panel stack">
    <h2>邊牧</h2>
    <div class="row">
      <DogPortrait />
      <div class="stack">
        <label class="row">名字 <input bind:value={dogName} maxlength="10" size="10" onchange={saveName} aria-label="邊牧的名字" /></label>
        <p class="hearts" aria-label="好感度 {heartN} 顆心">
          {#each Array(MAX_HEARTS) as _, i (i)}<span class:on={i < heartN}>♥</span>{/each}
        </p>
      </div>
    </div>
    <p class="soft">
      {toNext === null ? '好感度滿了！' : `再 ${toNext} 點好感度到下一顆心。`}每天摸摸牠（前 {PET_PER_DAY} 次各 +{PET_GAIN}）、澆完當天的水（+{WATER_GAIN}）、餵果實（每顆 +{FEED_GAIN}，一天最多 {FEED_PER_DAY} 顆）。好感度不會減少。
    </p>
    <ul class="tricks">
      {#each TRICKS as t (t.id)}
        <li class:locked={heartN < t.heart}><span class="h">{'♥'.repeat(t.heart)}</span>{heartN >= t.heart ? t.label : '還沒學會'}</li>
      {/each}
    </ul>
  </div>

  <div class="panel stack">
    <h2>每天種幾個新字</h2>
    <PlanPicker
      bind:mode={plan.mode}
      bind:perDay={plan.perDay}
      bind:examDate={plan.examDate}
      bind:examCap={plan.examCap}
      {remaining}
      today={today()}
    />
    <div class="row">
      <button class="btn green" disabled={!planChanged || !planValid} onclick={applyPlan}>套用</button>
      {#if saved}<span class="soft">已套用，今天的種子數已更新</span>{/if}
    </div>
  </div>

  <div class="panel stack">
    <h2>種子袋</h2>
    <SeedPrefs
      levels={app.settings.levels}
      regions={app.settings.regions}
      onlevels={(levels) => saveSettings({ levels })}
      onregions={(regions) => saveSettings({ regions })}
    />
    <p class="soft">只會種已經有三語內容的字。</p>
  </div>

  <div class="panel stack">
    <h2>複習</h2>
    <div class="row">
      {#each PACES as [v, label] (v)}
        <button class="btn" class:on={app.settings.pace === v} onclick={() => saveSettings({ pace: v })}>{label}</button>
      {/each}
    </div>
    <p class="soft">{PACES.find((p) => p[0] === app.settings.pace)?.[2]}</p>
    <label class="row">
      每天澆水上限
      <input
        type="number"
        inputmode="numeric"
        min="20"
        max="999"
        value={app.settings.reviewCap}
        onchange={(e) => saveSettings({ reviewCap: Math.max(20, Number(e.currentTarget.value) || 100) })}
      />
      株
    </label>
    <p class="soft">幾天沒複習時，欠的作物會分散到之後幾天。{app.settings.planMode === 'exam' ? '考試模式會依每天新字數自動調高。' : ''}</p>
  </div>

  <div class="panel stack">
    <h2>卡片</h2>
    <div class="row">
      {#each DIRS as [v, label] (v)}
        <button class="btn" class:on={app.settings.direction === v} onclick={() => saveSettings({ direction: v })}>{label}</button>
      {/each}
    </div>
    <div class="row">
      提示語言
      {#each HINTS as [v, label] (v)}
        <button class="btn" class:on={app.settings.hintLang === v} onclick={() => saveSettings({ hintLang: v })}>{label}</button>
      {/each}
    </div>
    <label class="row">
      <input type="checkbox" checked={app.settings.autoSpeak} onchange={(e) => saveSettings({ autoSpeak: e.currentTarget.checked })} />
      出卡時自動唸德文
    </label>
  </div>

  <div class="panel stack">
    <h2>進度資料</h2>
    <p class="soft">
      {app.persisted
        ? '已開啟永久儲存。進度存在這台裝置上，刪除 App 或清除網站資料就會不見，記得定期匯出備份。'
        : '尚未開啟永久儲存。請先「加入主畫面」再使用，並定期匯出備份。'}
    </p>
    <div class="row">
      <button class="btn" onclick={doExport}>匯出進度</button>
      <button class="btn" onclick={() => fileInput.click()}>匯入進度</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={doImport} />
    </div>
  </div>

  <div class="panel stack">
    <h2>App 版本</h2>
    <p class="soft">目前版本：{BUILD}</p>
    <div class="row">
      <button class="btn" disabled={checking} onclick={update}>檢查更新</button>
      {#if updateMsg}<span class="soft" role="status">{updateMsg}</span>{/if}
    </div>
    <p class="soft">平常打開 App 就會自動更新；剛推出新版想馬上用，可以按這裡。進度存在裝置上，更新不會影響。</p>
  </div>

  <div class="panel">
    <p class="soft">
      單字依 Goethe-Zertifikat B1 官方單字表整理，例句與翻譯為原創。字體：俐方體 11 號（Cubic 11，SIL Open Font License）。
    </p>
  </div>
</div>

<style>
  .hearts {
    margin: 0;
    color: #8a6a50;
    letter-spacing: 0.15em;
  }
  .hearts .on {
    color: #e0484a;
  }
  .tricks {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tricks li {
    display: flex;
    gap: calc(var(--u) * 3);
  }
  .tricks .h {
    color: #e0484a;
    min-width: 5em;
  }
  .tricks li.locked {
    color: var(--ink-soft);
  }
  .tricks li.locked .h {
    color: #8a6a50;
  }
</style>
