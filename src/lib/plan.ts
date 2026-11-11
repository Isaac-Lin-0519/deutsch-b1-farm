import { addDays, daysBetween } from './day';
import { wordLevel } from './region';
import {
  AMOUNT_WEIGHT,
  DEFAULT_LEVEL_PREFS,
  DEFAULT_REGION_PREFS,
  LEVELS,
  type LegacySeedBag,
  type Level,
  type LevelPrefs,
  type RegionPrefs,
  type Settings,
  type Word,
} from './types';

/** 考前幾天停止播種，只澆水 */
export const EXAM_STOP_DAYS = 14;
/** 考試模式算出來每天超過這個數字就提醒 */
export const EXAM_WARN_PER_DAY = 30;

/** 舊版「種子袋」換算成等級開關：從 A1 開始＝A1 為主，A2、B1 少一點 */
export function levelsFromBag(bag: LegacySeedBag): LevelPrefs {
  if (bag === 'A1+') return { A1: 'high', A2: 'mid', B1: 'mid' };
  if (bag === 'A2+') return { A1: 'none', A2: 'high', B1: 'mid' };
  return { A1: 'none', A2: 'none', B1: 'high' };
}

/** 從今天（含）到停止播種日（含）還剩幾天 */
export function examDaysLeft(today: string, examDate: string): number {
  const stop = addDays(examDate, -EXAM_STOP_DAYS);
  return Math.max(0, daysBetween(today, stop) + 1);
}

/** 考試模式：還沒種的字 ÷ 剩下天數，無條件進位 */
export function examPerDay(remaining: number, today: string, examDate: string): number {
  const days = examDaysLeft(today, examDate);
  if (days <= 0 || remaining <= 0) return 0;
  return Math.ceil(remaining / days);
}

/** 今天要種的新字數（考試模式會套用每天上限） */
export function dailyQuota(s: Settings, remaining: number, today: string): number {
  if (s.planMode === 'exam' && s.examDate) {
    const q = examPerDay(remaining, today, s.examDate);
    return s.examCap ? Math.min(s.examCap, q) : q;
  }
  return s.newPerDay;
}

/** 每天澆水上限；考試模式新字多時自動調高，避免複習一直往後延 */
export function reviewCap(s: Settings, quota: number): number {
  return s.planMode === 'exam' ? Math.max(s.reviewCap, quota * 8) : s.reviewCap;
}

/** 選每天新字數時顯示的估計（每個新字每天約帶來 1～2 分鐘的複習） */
export function estimate(perDay: number, total: number, today: string) {
  const days = perDay > 0 ? Math.ceil(total / perDay) : 0;
  return { minLo: perDay, minHi: perDay * 2, days, finishDay: addDays(today, days) };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 種子袋：低等級先種；同等級內用固定的亂數順序，避免相似的字擠在同一天 */
/** 把 id 穩定地對應到 (0,1)，同一個字每次都一樣，所以排出來的順序不會每次重抽 */
function unit(id: string): number {
  let h = hash(id);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h + 0.5) / 4294967296;
}

/** 還沒種、有地區與等級允許的字（只看開關，不看有沒有內容） */
function pool(words: Word[], levels: LevelPrefs, planted: Set<string>, region: RegionPrefs): Word[] {
  return words.filter((w) => !planted.has(w.id) && AMOUNT_WEIGHT[levels[w.level]] > 0 && AMOUNT_WEIGHT[wordLevel(w, region)] > 0);
}

/**
 * 每個等級分到的新字比例（高:中＝3:1）。字多的等級不會因為字多就佔大多數；
 * 某個等級的字種完了，就由其他等級補上。
 */
export function levelShares(words: Word[], levels: LevelPrefs, planted: Set<string>, region: RegionPrefs = DEFAULT_REGION_PREFS): Record<Level, number> {
  const has = new Set(pool(words, levels, planted, region).map((w) => w.level));
  const total = LEVELS.reduce((n, l) => n + (has.has(l) ? AMOUNT_WEIGHT[levels[l]] : 0), 0);
  return Object.fromEntries(LEVELS.map((l) => [l, total && has.has(l) ? AMOUNT_WEIGHT[levels[l]] / total : 0])) as Record<Level, number>;
}

/**
 * 新字的順序：依各等級的比例加權抽籤（等級權重 ÷ 該等級的字數，再乘上地區權重）。
 * 每個字用自己的 id 算出固定的亂數，所以同樣的設定排出來的順序一樣。
 */
export function seedOrder(words: Word[], levels: LevelPrefs, planted: Set<string>, region: RegionPrefs = DEFAULT_REGION_PREFS): Word[] {
  const ps = pool(words, levels, planted, region).filter((w) => w.senses?.length);
  const mass: Record<string, number> = {};
  for (const w of ps) mass[w.level] = (mass[w.level] ?? 0) + AMOUNT_WEIGHT[wordLevel(w, region)];
  const key = (w: Word) => -Math.log(unit(w.id)) / ((AMOUNT_WEIGHT[levels[w.level]] / mass[w.level]) * AMOUNT_WEIGHT[wordLevel(w, region)]);
  return ps.map((w) => [key(w), w] as const).sort((a, b) => a[0] - b[0]).map(([, w]) => w);
}

export function remainingInBag(words: Word[], levels: LevelPrefs = DEFAULT_LEVEL_PREFS, planted: Set<string> = new Set(), region: RegionPrefs = DEFAULT_REGION_PREFS): number {
  return pool(words, levels, planted, region).length;
}
