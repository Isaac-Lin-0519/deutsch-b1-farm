import type { Region, RegionLevel, RegionPrefs, Word } from './types';
import { REGIONS } from './types';

export const REGION_NAMES: Record<Region, string> = { D: '德國', A: '奧地利', CH: '瑞士' };
export const LEVEL_NAMES: Record<RegionLevel, string> = { none: '無', mid: '中', high: '高' };
/**
 * 這個字在哪些地區用。回傳 null 代表三個地區通用，不受地區設定影響。
 * - 有自己的地區標記就用它（例如 Marille → A）。
 * - 沒標記但註記說「某地區用另一個字」，代表它在其餘地區用（例如 Billett 註記 D、A 用 Fahrkarte → 只有 CH）。
 */
export function wordRegions(w: Word): Region[] | null {
  if (w.regions?.length) return w.regions.filter((r): r is Region => (REGIONS as string[]).includes(r));
  if (w.variant_of?.regions.length) return REGIONS.filter((r) => !w.variant_of!.regions.includes(r));
  return null;
}

/** 這個字在目前設定下的出現程度：取它用到的地區裡最高的那個；通用字永遠是高 */
export function wordLevel(w: Word, prefs: RegionPrefs): RegionLevel {
  const rs = wordRegions(w);
  if (!rs || !rs.length) return 'high';
  let best: RegionLevel = 'none';
  for (const r of rs) {
    const l = prefs[r];
    if (l === 'high') return 'high';
    if (l === 'mid') best = 'mid';
  }
  return best;
}

/** 種不種／翻不翻（已種下的字不受影響，由呼叫端處理） */
export function regionAllows(w: Word, prefs: RegionPrefs): boolean {
  return wordLevel(w, prefs) !== 'none';
}
