<script lang="ts">
  import { onMount } from 'svelte';
  import { addDays, dayKey, formatDay } from '../lib/day';
  import { grammarLogsSince, logsSince } from '../lib/db';
  import { GROUPS, mastered, type GLog } from '../lib/grammar';
  import { grammar, grammarSummary } from '../lib/grammar.svelte';
  import { app, today, word } from '../lib/store.svelte';
  import { LEVELS, type ReviewLog } from '../lib/types';
  import Headword from '../components/Headword.svelte';

  let logs = $state.raw<ReviewLog[]>([]);
  let glogs = $state.raw<GLog[]>([]);
  let loaded = $state(false);

  onMount(async () => {
    [logs, glogs] = await Promise.all([logsSince(Date.now() - 400 * 86_400_000), grammarLogsSince(Date.now() - 2 * 86_400_000)]);
    loaded = true;
  });

  const t = $derived(today());
  const byDay = $derived.by(() => {
    const m = new Map<string, { n: number; ok: number }>();
    for (const l of logs) {
      const k = dayKey(new Date(l.ts));
      const v = m.get(k) ?? { n: 0, ok: 0 };
      v.n++;
      if (l.rating >= 3) v.ok++;
      m.set(k, v);
    }
    return m;
  });

  const streak = $derived.by(() => {
    let d = byDay.has(t) ? t : addDays(t, -1);
    let n = 0;
    while (byDay.has(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  });

  const todayStat = $derived(byDay.get(t) ?? { n: 0, ok: 0 });

  const calendar = $derived.by(() => {
    const start = addDays(t, -29);
    const wd = (new Date(`${start}T12:00:00`).getDay() + 6) % 7; // 星期一＝0
    const cells: ({ day: string; n: number } | null)[] = Array(wd).fill(null);
    for (let i = 0; i < 30; i++) {
      const day = addDays(start, i);
      cells.push({ day, n: byDay.get(day)?.n ?? 0 });
    }
    return cells;
  });
  const heat = (n: number) => (n === 0 ? 'h0' : n < 20 ? 'h1' : n < 50 ? 'h2' : 'h3');

  const levels = $derived(
    LEVELS.map((lv) => {
      const words = app.words.filter((w) => w.level === lv);
      let bush = 0;
      let growing = 0;
      for (const w of words) {
        const r = app.cards[w.id];
        if (!r) continue;
        if (r.stage === 'bush') bush++;
        else growing++;
      }
      return { lv, total: words.length, bush, growing, none: words.length - bush - growing };
    }),
  );

  const forecast = $derived.by(() => {
    const counts = Array(7).fill(0);
    for (const r of Object.values(app.cards)) {
      const d = Math.max(0, Math.round((Date.parse(`${dayKey(r.c.due)}T12:00:00`) - Date.parse(`${t}T12:00:00`)) / 86_400_000));
      if (d < 7) counts[d]++;
    }
    return counts.map((n, i) => ({ day: addDays(t, i), n }));
  });
  const maxF = $derived(Math.max(1, ...forecast.map((f) => f.n)));

  const missed = $derived(
    Object.values(app.cards)
      .filter((r) => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 10),
  );
  const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

  // ---- 連接詞與文法（自己一套排程，和上面的單字分開算） ----
  const gSum = $derived(grammarSummary());
  const gToday = $derived.by(() => {
    const ls = glogs.filter((l) => dayKey(new Date(l.ts)) === t);
    return { n: ls.length, ok: ls.filter((l) => l.rating >= 3).length };
  });
  const gGroups = $derived(
    GROUPS.map((g) => {
      const pts = grammar.points.filter((p) => p.group === g.id);
      let done = 0;
      let learning = 0;
      for (const p of pts) {
        const r = grammar.recs[p.id];
        if (!r) continue;
        if (mastered(r)) done++;
        else learning++;
      }
      return { ...g, total: pts.length, done, learning, none: pts.length - done - learning };
    }),
  );
  const gMissed = $derived(
    Object.values(grammar.recs)
      .filter((r) => r.wrong > 0 && grammar.byId.has(r.id))
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5),
  );
</script>

<div class="screen stack">
  <div class="panel">
    <h2>複習紀錄</h2>
    <div class="tiles">
      <div><div class="num">{streak}</div><div class="soft">連續天數</div></div>
      <div><div class="num">{todayStat.n}</div><div class="soft">今天複習</div></div>
      <div>
        <div class="num">{todayStat.n ? Math.round((todayStat.ok / todayStat.n) * 100) + '%' : '—'}</div>
        <div class="soft">今天正確率</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <h2>最近 30 天</h2>
    {#if loaded}
      <div class="cal">
        {#each WEEK as d}<div class="wd soft">{d}</div>{/each}
        {#each calendar as c}
          {#if c}
            <div class="cell {heat(c.n)}" title="{formatDay(c.day)}：{c.n} 張" class:today={c.day === t}></div>
          {:else}
            <div></div>
          {/if}
        {/each}
      </div>
      <div class="legend soft">
        <span class="cell h0"></span>0 <span class="cell h1"></span>1～19 <span class="cell h2"></span>20～49 <span class="cell h3"></span>50+
      </div>
    {/if}
  </div>

  <div class="panel">
    <h2>各等級進度</h2>
    {#each levels as l}
      <div class="lv">
        <div class="row between"><span>{l.lv}</span><span class="soft">結果 {l.bush}・成長中 {l.growing}・未種 {l.none}</span></div>
        <div class="bar">
          <div class="b-bush" style="width:{(l.bush / l.total) * 100}%"></div>
          <div class="b-grow" style="width:{(l.growing / l.total) * 100}%"></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="panel">
    <h2>未來 7 天要澆水</h2>
    <div class="fc">
      {#each forecast as f, i}
        <div class="fcol">
          <div class="soft small n">{f.n}</div>
          <div class="fbar" style="height:{(f.n / maxF) * 100}%"></div>
          <div class="soft small d">{i === 0 ? '今天' : formatDay(f.day).replace(' 月 ', '/').replace(' 日', '')}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="panel">
    <h2>最常答錯的字</h2>
    {#if missed.length}
      {#each missed as r}
        {@const w = word(r.id)}
        <div class="miss">
          <Headword word={w} forms={false} />
          <div class="soft">{w.senses?.[0]?.zh ?? ''}・答錯 {r.wrong} 次</div>
        </div>
      {/each}
    {:else}
      <p class="soft">還沒有答錯的字。</p>
    {/if}
  </div>

  {#if grammar.ready}
    <div class="panel">
      <h2>連接詞與文法</h2>
      <div class="tiles">
        <div><div class="num">{gSum.started}/{gSum.total}</div><div class="soft">已學文法點</div></div>
        <div><div class="num">{loaded ? gToday.n : '—'}</div><div class="soft">今天練習</div></div>
        <div>
          <div class="num">{gToday.n ? Math.round((gToday.ok / gToday.n) * 100) + '%' : '—'}</div>
          <div class="soft">今天正確率</div>
        </div>
      </div>
      <p class="soft due">{gSum.due ? `今天還有 ${gSum.due} 個要複習` : '今天沒有要複習的'}{gSum.fresh ? `・可以新學 ${gSum.fresh} 個` : ''}</p>
      {#each gGroups as g}
        <div class="lv">
          <div class="row between">
            <span>{g.zh}</span>
            <span class="soft">{g.total ? `熟練 ${g.done}・練習中 ${g.learning}・未學 ${g.none}` : '內容準備中'}</span>
          </div>
          <div class="bar">
            {#if g.total}
              <div class="b-bush" style="width:{(g.done / g.total) * 100}%"></div>
              <div class="b-grow" style="width:{(g.learning / g.total) * 100}%"></div>
            {/if}
          </div>
        </div>
      {/each}
      {#if gMissed.length}
        <h3 class="sub">最常答錯的文法</h3>
        {#each gMissed as r}
          {@const p = grammar.byId.get(r.id)!}
          <div class="miss"><span>{p.de}</span> <span class="soft">{p.zh}・答錯 {r.wrong} 次</span></div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    text-align: center;
  }
  .num {
    font-size: var(--fs2);
    line-height: 1.2;
  }
  .cal {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: calc(var(--u) * 1.5);
  }
  .wd {
    text-align: center;
  }
  .cell {
    aspect-ratio: 1;
    border: var(--u) solid var(--out);
  }
  .cell.today {
    outline: var(--u) solid var(--wood-hi);
    outline-offset: var(--u);
  }
  .h0 {
    background: var(--paper-lo);
  }
  .h1 {
    background: #b7e08a;
  }
  .h2 {
    background: #6aa83c;
  }
  .h3 {
    background: #2f6b2a;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: calc(var(--u) * 2);
    margin-top: calc(var(--u) * 3);
    flex-wrap: wrap;
  }
  .legend .cell {
    width: calc(var(--u) * 5);
    height: calc(var(--u) * 5);
    display: inline-block;
  }
  .lv + .lv {
    margin-top: calc(var(--u) * 4);
  }
  .between {
    justify-content: space-between;
  }
  .bar {
    display: flex;
    height: calc(var(--u) * 4);
    background: var(--paper-lo);
    border: var(--u) solid var(--out);
  }
  .b-bush {
    background: var(--die);
  }
  .b-grow {
    background: #7cc552;
  }
  .fc {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: calc(var(--u) * 2);
    height: 140px;
    align-items: end;
  }
  .fcol {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
  }
  .fbar {
    width: 70%;
    min-height: 2px;
    background: #3d7fd9;
    border: var(--u) solid var(--out);
  }
  .n,
  .d {
    white-space: nowrap;
  }
  .miss + .miss {
    margin-top: calc(var(--u) * 3);
    padding-top: calc(var(--u) * 3);
    border-top: var(--u) dashed var(--paper-lo);
  }
  .due {
    margin: calc(var(--u) * 3) 0 calc(var(--u) * 4);
    text-align: center;
  }
  .sub {
    margin-top: calc(var(--u) * 5);
  }
  .miss :global(.big) {
    font-size: var(--fs);
  }
</style>
