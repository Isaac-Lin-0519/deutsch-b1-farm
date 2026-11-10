/** 一天從凌晨 4 點開始算，半夜複習還算前一天 */
export const ROLLOVER_HOURS = 4;
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayKey(now: Date): string {
  return keyOf(new Date(now.getTime() - ROLLOVER_HOURS * 3_600_000));
}

/** 今天結束（下一個凌晨 4 點）的時間點 */
export function endOfDay(now: Date): Date {
  const t = new Date(now.getTime() - ROLLOVER_HOURS * 3_600_000);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, ROLLOVER_HOURS);
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(key: string, n: number): string {
  const d = new Date((dayNumber(key) + n) * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 「11 月 10 日」 */
export function formatDay(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m} 月 ${d} 日`;
}

/** 「2027 年 3 月 4 日」 */
export function formatDayLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}
