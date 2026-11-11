import type { RegionPref, Word } from './types';

export const REGION_PREFS: [RegionPref, string, string][] = [
  ['all', '德奧瑞都練', '德國、奧地利、瑞士的說法都會種。'],
  ['later', '奧瑞說法最後才種', '先種德國通用的字，只有奧地利或瑞士才用的說法排到最後。'],
  ['de', '只練德國用法', '奧地利、瑞士才用的說法不種、不出現在翻卡（已經種下的還是會澆水）。'],
];

/** 這個字是不是只有奧地利或瑞士才用（德國不這樣說） */
export function outsideGermany(w: Word): boolean {
  if (w.regions?.length) return !w.regions.includes('D');
  // 沒有自己的地區標記，但註記說「德國用另一個字」，代表這個字是奧瑞的說法
  return !!w.variant_of?.regions.includes('D');
}

/** 依地區偏好決定這個字種不種／翻不翻（已種下的字不受影響，由呼叫端處理） */
export function regionAllows(w: Word, pref: RegionPref): boolean {
  return pref !== 'de' || !outsideGermany(w);
}
