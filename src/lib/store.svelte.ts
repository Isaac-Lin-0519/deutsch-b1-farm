import { addDays, dayKey, daysBetween, endOfDay, ROLLOVER_HOURS } from './day';
import * as db from './db';
import { dailyQuota, EXAM_STOP_DAYS, hash, remainingInBag, reviewCap, seedOrder } from './plan';
import { isLearning, makeScheduler, newCard, nextStage, Rating, tooEasyCard, type Grade } from './srs';
import { FEED_GAIN, FEED_PER_DAY, freshCare, hearts, PET_GAIN, PET_PER_DAY, WATER_GAIN } from './affection';
import {
  defaultProfile,
  DEFAULT_SETTINGS,
  type CardRecord,
  type Daily,
  type FruitKind,
  type Profile,
  type ReviewLog,
  type Settings,
  type Word,
} from './types';

const DAY_MS = 86_400_000;

class AppState {
  ready = $state(false);
  error = $state('');
  settings = $state<Settings>({ ...DEFAULT_SETTINGS });
  profile = $state<Profile>(defaultProfile());
  daily = $state<Daily>({ day: '', quota: 0, planted: 0, reviewed: 0 });
  /** 整個換掉來觸發更新，不做深層追蹤 */
  cards = $state.raw<Record<string, CardRecord>>({});
  persisted = $state(false);
  /** 時鐘：每分鐘更新，讓「該澆水」的狀態跟著時間變 */
  now = $state(new Date());
  words: Word[] = [];
  byId = new Map<string, Word>();
}

export const app = new AppState();

export function word(id: string): Word {
  const w = app.byId.get(id);
  if (!w) throw new Error(`找不到單字 ${id}`);
  return w;
}

export function fruitOf(w: Word): FruitKind {
  const a = w.pos === 'noun' ? w.articles?.[0] : undefined;
  return a === 'der' || a === 'die' || a === 'das' ? a : 'other';
}

function snap<T>(v: T): T {
  return $state.snapshot(v) as T;
}

async function loadWords(): Promise<Word[]> {
  const res = await fetch(new URL('data/words.json', document.baseURI));
  if (!res.ok) throw new Error(`讀取單字資料失敗（${res.status}）`);
  return res.json();
}

export async function init() {
  try {
    const [words, cards, settings, profile, daily] = await Promise.all([
      loadWords(),
      db.getAllCards(),
      db.getKV('settings'),
      db.getKV('profile'),
      db.getKV('daily'),
    ]);
    app.words = words;
    app.byId = new Map(words.map((w) => [w.id, w]));
    app.cards = Object.fromEntries(cards.filter((c) => app.byId.has(c.id)).map((c) => [c.id, c]));
    if (settings) app.settings = { ...DEFAULT_SETTINGS, ...settings };
    if (profile) app.profile = { ...defaultProfile(), ...profile };
    if (daily) app.daily = daily;
    rollDay();
    app.ready = true;
    setInterval(() => {
      app.now = new Date();
      rollDay();
    }, 60_000);
    app.persisted = await db.requestPersist().catch(() => false);
  } catch (e) {
    app.error = e instanceof Error ? e.message : String(e);
  }
}

export function plantedSet(): Set<string> {
  return new Set(Object.keys(app.cards));
}

export function today(): string {
  return dayKey(app.now);
}

/** 換日時重算今天的新字數 */
export function rollDay() {
  const day = dayKey(new Date());
  if (app.daily.day === day) return;
  const remaining = remainingInBag(app.words, app.settings.seedBag, plantedSet(), app.settings.region);
  app.daily = { day, quota: dailyQuota(app.settings, remaining, day), planted: 0, reviewed: 0 };
  void db.setKV('daily', snap(app.daily));
}

/** 改了設定後重算今天的量（已經種的不算進剩下的） */
export function recomputeQuota() {
  const day = today();
  const remaining = remainingInBag(app.words, app.settings.seedBag, plantedSet(), app.settings.region);
  const q = dailyQuota(app.settings, remaining, day);
  app.daily.quota = app.settings.planMode === 'exam' ? app.daily.planted + q : q;
  void db.setKV('daily', snap(app.daily));
}

export async function saveSettings(patch: Partial<Settings>) {
  Object.assign(app.settings, patch);
  await db.setKV('settings', snap(app.settings));
  recomputeQuota();
  await pullBeforeExam();
}

/**
 * 複習間隔不超過考試日：已經排到考試日之後的作物，
 * 平均分散到考前 14 天（不種新字的那兩週）再澆一次水。
 */
async function pullBeforeExam() {
  const s = app.settings;
  if (s.planMode !== 'exam' || !s.examDate) return;
  const t = today();
  if (daysBetween(t, s.examDate) <= 1) return;
  const start = daysBetween(t, addDays(s.examDate, -EXAM_STOP_DAYS)) > 0 ? addDays(s.examDate, -EXAM_STOP_DAYS) : addDays(t, 1);
  const span = Math.max(1, daysBetween(start, s.examDate));
  const limit = new Date(`${s.examDate}T00:00:00`).getTime();
  const moved: CardRecord[] = [];
  for (const r of Object.values(app.cards)) {
    if (r.c.due.getTime() < limit) continue;
    const day = addDays(start, hash(r.id) % span);
    const [y, m, d] = day.split('-').map(Number);
    moved.push({ ...r, c: { ...r.c, due: new Date(y, m - 1, d, ROLLOVER_HOURS + 6) } });
  }
  if (!moved.length) return;
  const next = { ...app.cards };
  for (const r of moved) next[r.id] = r;
  app.cards = next;
  await db.putCards(moved);
}

/** 今天到期（含逾期、含學習中）的作物，最早到期的排前面 */
export function dueList(now = app.now): CardRecord[] {
  const eod = endOfDay(now).getTime();
  return Object.values(app.cards)
    .filter((r) => r.c.due.getTime() <= eod)
    .sort((a, b) => a.c.due.getTime() - b.c.due.getTime());
}

export function reviewsLeftToday(): number {
  return Math.max(0, reviewCap(app.settings, app.daily.quota) - app.daily.reviewed);
}

export function seedsLeftToday(): number {
  return Math.max(0, app.daily.quota - app.daily.planted);
}

/** 今天還能種的新字（只會種已經有三語內容的字） */
export function todaysSeeds(): Word[] {
  return seedOrder(app.words, app.settings.seedBag, plantedSet(), app.settings.region).slice(0, seedsLeftToday());
}

export function plotState(r: CardRecord, now = app.now) {
  const due = r.c.due.getTime();
  return {
    dry: due <= endOfDay(now).getTime(),
    wilt: due < now.getTime() - 3 * DAY_MS,
  };
}

/** 設了考試日期時，複習間隔不超過考試日（文法練習也用同一條規則） */
export function maxInterval(now: Date): number | undefined {
  const s = app.settings;
  if (s.planMode !== 'exam' || !s.examDate) return undefined;
  return Math.max(1, daysBetween(dayKey(now), s.examDate));
}

function setCard(rec: CardRecord) {
  app.cards = { ...app.cards, [rec.id]: rec };
}

/** 澆水（評分）。回傳新的作物狀態，答對結果的作物會收成一顆果實 */
export async function rate(id: string, grade: Grade, now = new Date()) {
  rollDay();
  const prev = app.cards[id];
  const isNew = !prev;
  const before = prev ? prev.c : newCard(now);
  const wasReview = !!prev && !isLearning(prev.c);
  const after = makeScheduler(app.settings.pace, maxInterval(now)).next(before, now, grade).card;
  const stage = nextStage(prev?.stage ?? 'seed', grade, after);
  const rec: CardRecord = {
    id,
    c: after,
    stage,
    plantedAt: prev?.plantedAt ?? now.getTime(),
    wrong: (prev?.wrong ?? 0) + (grade === Rating.Again ? 1 : 0),
  };
  let fruit: FruitKind | null = null;
  if ((grade === Rating.Good || grade === Rating.Easy) && stage === 'bush') {
    fruit = fruitOf(word(id));
    app.profile.fruits[fruit]++;
  }
  if (isNew) app.daily.planted++;
  else if (wasReview) app.daily.reviewed++;
  setCard(rec);
  const log: ReviewLog = { id, ts: now.getTime(), rating: grade, isNew, stage };
  await db.saveReview(rec, log, snap(app.daily), snap(app.profile));
  return { rec, fruit };
}

/** 「太簡單了」：沒種過的字會直接種下並長到結果 */
export async function markTooEasy(id: string, now = new Date()) {
  rollDay();
  const prev = app.cards[id];
  const rec: CardRecord = {
    id,
    c: tooEasyCard(prev?.c ?? newCard(now), now, maxInterval(now)),
    stage: 'bush',
    plantedAt: prev?.plantedAt ?? now.getTime(),
    wrong: prev?.wrong ?? 0,
  };
  if (!prev) app.daily.planted++;
  setCard(rec);
  const log: ReviewLog = { id, ts: now.getTime(), rating: Rating.Easy, isNew: !prev, stage: 'bush' };
  await db.saveReview(rec, log, snap(app.daily), snap(app.profile));
}

/** 「重新學」：退回種子，今天就會再出現 */
export async function relearn(id: string, now = new Date()) {
  const prev = app.cards[id];
  if (!prev) return;
  const f = makeScheduler(app.settings.pace);
  const rec: CardRecord = { ...prev, c: f.forget(prev.c, now, false).card, stage: 'seed' };
  setCard(rec);
  await db.putCard(rec);
}

export async function reloadAfterImport() {
  location.reload();
}

/** 今天這一輪：先澆水（學習中的全部 + 到期複習不超過上限），再播種 */
export function todaysQueue(now = app.now) {
  let left = reviewsLeftToday();
  const reviews = dueList(now).filter((r) => isLearning(r.c) || left-- > 0);
  return { reviews, seeds: todaysSeeds() };
}

export function examDaysAway(): number | null {
  const s = app.settings;
  if (s.planMode !== 'exam' || !s.examDate) return null;
  return daysBetween(today(), s.examDate);
}

// ---- 邊牧 ----

function care() {
  app.profile.care = freshCare(app.profile.care, today());
  return app.profile.care;
}

/** 加好感度；回傳新到達的心數（沒有多一顆心就是 0） */
async function addAffection(n: number): Promise<number> {
  const before = hearts(app.profile.affection);
  app.profile.affection += n;
  await db.setKV('profile', snap(app.profile));
  const after = hearts(app.profile.affection);
  return after > before ? after : 0;
}

/** 摸摸：每天前 3 次加好感度 */
export async function petDog() {
  const c = care();
  if (c.pets >= PET_PER_DAY) return { gained: false, heart: 0 };
  c.pets++;
  return { gained: true, heart: await addAffection(PET_GAIN) };
}

export function fruitCount(): number {
  return Object.values(app.profile.fruits).reduce((a, b) => a + b, 0);
}

export type FeedResult = { ok: true; heart: number } | { ok: false; reason: 'empty' | 'full' };

/** 現在能不能餵（沒有果實、或今天吃飽了） */
export function canFeed(): 'ok' | 'empty' | 'full' {
  if (fruitCount() === 0) return 'empty';
  return care().fed >= FEED_PER_DAY ? 'full' : 'ok';
}

/** 餵一顆果實（從最多的那種拿）；一天最多 10 顆 */
export async function feedDog(): Promise<FeedResult> {
  const c = care();
  const can = canFeed();
  if (can !== 'ok') return { ok: false, reason: can };
  const f = app.profile.fruits;
  const kind = (Object.keys(f) as FruitKind[]).reduce((a, b) => (f[b] > f[a] ? b : a));
  f[kind]--;
  c.fed++;
  return { ok: true, heart: await addAffection(FEED_GAIN) };
}

/** 今天的水澆完了（有澆過、而且沒有剩下要澆或要種的），一天算一次 */
export async function claimWatered(): Promise<number | null> {
  const c = care();
  const done = app.daily.reviewed + app.daily.planted > 0;
  const { reviews, seeds } = todaysQueue();
  if (c.watered || !done || reviews.length || seeds.length) return null;
  c.watered = true;
  return addAffection(WATER_GAIN);
}
