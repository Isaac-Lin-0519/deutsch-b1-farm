import { addDays, daysBetween } from './day';
import { regionAllows, wordLevel } from './region';
import { DEFAULT_REGION_PREFS, type Level, type RegionPrefs, type SeedBag, type Settings, type Word } from './types';

/** 考前幾天停止播種，只澆水 */
export const EXAM_STOP_DAYS = 14;
/** 考試模式算出來每天超過這個數字就提醒 */
export const EXAM_WARN_PER_DAY = 30;

export function seedLevels(bag: SeedBag): Level[] {
  if (bag === 'A1+') return ['A1', 'A2', 'B1'];
  if (bag === 'A2+') return ['A2', 'B1'];
  return ['B1'];
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
export function seedOrder(words: Word[], bag: SeedBag, planted: Set<string>, region: RegionPrefs = DEFAULT_REGION_PREFS): Word[] {
  const levels = seedLevels(bag);
  const late = (w: Word) => (wordLevel(w, region) === 'mid' ? 1 : 0);
  return words
    .filter((w) => w.senses?.length && !planted.has(w.id) && levels.includes(w.level) && regionAllows(w, region))
    .sort((a, b) => late(a) - late(b) || levels.indexOf(a.level) - levels.indexOf(b.level) || hash(a.id) - hash(b.id));
}
export function remainingInBag(words: Word[], bag: SeedBag, planted: Set<string>, region: RegionPrefs = DEFAULT_REGION_PREFS): number {
  const levels = seedLevels(bag);
  return words.filter((w) => levels.includes(w.level) && !planted.has(w.id) && regionAllows(w, region)).length;
}
