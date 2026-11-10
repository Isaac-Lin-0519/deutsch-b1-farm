// 連接詞與文法練習的進度：自己一套間隔重複，不進農場
import { dayKey, endOfDay } from './day';
import * as db from './db';
import { GRAMMAR_NEW_PER_DAY, mastered, type GDaily, type GKind, type GLog, type GPoint, type GRecord } from './grammar';
import { makeScheduler, newCard, Rating, type Grade } from './srs';
import { app, maxInterval } from './store.svelte';

class GrammarState {
  ready = $state(false);
  points = $state.raw<GPoint[]>([]);
  /** 整個換掉來觸發更新，不做深層追蹤 */
  recs = $state.raw<Record<string, GRecord>>({});
  daily = $state<GDaily>({ day: '', started: 0, extra: 0 });
  byId = new Map<string, GPoint>();
}

export const grammar = new GrammarState();

/** 文法內容讀不到時不影響單字農場，只是黑板點了沒有東西 */
export async function initGrammar() {
  try {
    const [res, recs, daily] = await Promise.all([
      fetch(new URL('data/grammar.json', document.baseURI)),
      db.getAllGrammar(),
      db.getKV('gdaily'),
    ]);
    if (!res.ok) throw new Error(`讀取文法內容失敗（${res.status}）`);
    const points: GPoint[] = await res.json();
    grammar.byId = new Map(points.map((p) => [p.id, p]));
    grammar.points = points;
    grammar.recs = Object.fromEntries(recs.filter((r) => grammar.byId.has(r.id)).map((r) => [r.id, r]));
    if (daily) grammar.daily = daily;
    grammar.ready = true;
  } catch (e) {
    console.warn(e);
  }
}

const freshDaily = (day: string): GDaily => ({ day, started: 0, extra: 0 });

/** 今天的額度；換日後還沒練習過就當作全新的一天（這裡只讀不寫，可以放在 $derived 裡） */
function dailyFor(now: Date): GDaily {
  const day = dayKey(now);
  return grammar.daily.day === day ? grammar.daily : freshDaily(day);
}

function roll(now: Date) {
  const day = dayKey(now);
  if (grammar.daily.day !== day) grammar.daily = freshDaily(day);
}

/** 還沒開始學的文法點（照內容檔的順序，成對比的排在一起） */
export function unstarted(): GPoint[] {
  return grammar.points.filter((p) => !grammar.recs[p.id]);
}

/** 今天這一輪：到期的複習（最早到期的排前面），再加今天額度內的新文法點 */
export function grammarQueue(now = app.now) {
  const eod = endOfDay(now).getTime();
  const reviews = Object.values(grammar.recs)
    .filter((r) => r.c.due.getTime() <= eod)
    .sort((a, b) => a.c.due.getTime() - b.c.due.getTime());
  const d = dailyFor(now);
  const fresh = unstarted().slice(0, Math.max(0, GRAMMAR_NEW_PER_DAY + d.extra - d.started));
  return { reviews, fresh };
}

/** 閃卡自己評分；四選一和排語序答對算「記得」、答錯算「不會」 */
export async function rateGrammar(id: string, grade: Grade, kind: GKind, now = new Date()): Promise<GRecord> {
  roll(now);
  const prev = grammar.recs[id];
  const after = makeScheduler(app.settings.pace, maxInterval(now)).next(prev ? prev.c : newCard(now), now, grade).card;
  const rec: GRecord = {
    id,
    c: after,
    seen: (prev?.seen ?? 0) + 1,
    wrong: (prev?.wrong ?? 0) + (grade === Rating.Again ? 1 : 0),
    startedAt: prev?.startedAt ?? now.getTime(),
  };
  if (!prev) grammar.daily.started++;
  grammar.recs = { ...grammar.recs, [id]: rec };
  const log: GLog = { id, ts: now.getTime(), rating: grade, kind, isNew: !prev };
  await db.saveGrammarReview(rec, log, $state.snapshot(grammar.daily));
  return rec;
}

/** 今天想多學幾個新的 */
export async function moreGrammar(n = GRAMMAR_NEW_PER_DAY, now = new Date()) {
  roll(now);
  grammar.daily.extra += n;
  await db.setKV('gdaily', $state.snapshot(grammar.daily));
}

export function grammarSummary(now = app.now) {
  const recs = Object.values(grammar.recs);
  const q = grammarQueue(now);
  return {
    total: grammar.points.length,
    started: recs.length,
    mastered: recs.filter(mastered).length,
    due: q.reviews.length,
    fresh: q.fresh.length,
  };
}
