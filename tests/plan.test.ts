import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, endOfDay } from '../src/lib/day';
import { dailyQuota, examDaysLeft, examPerDay, levelShares, levelsFromBag, remainingInBag, reviewCap, seedOrder } from '../src/lib/plan';
import { regionAllows, wordLevel, wordRegions } from '../src/lib/region';
import { makeScheduler, newCard, nextStage, Rating, stageByInterval, State, tooEasyCard } from '../src/lib/srs';
import { mergeSettings } from '../src/lib/store.svelte';
import { DEFAULT_SETTINGS, type Amount, type LevelPrefs, type RegionPrefs, type Word } from '../src/lib/types';

describe('day', () => {
  it('凌晨 4 點前還算前一天', () => {
    expect(dayKey(new Date(2026, 10, 11, 3, 59))).toBe('2026-11-10');
    expect(dayKey(new Date(2026, 10, 11, 4, 0))).toBe('2026-11-11');
    expect(endOfDay(new Date(2026, 10, 10, 23, 0))).toEqual(new Date(2026, 10, 11, 4));
  });
  it('跨月跨年算天數', () => {
    expect(daysBetween('2026-11-10', '2027-01-27')).toBe(78);
    expect(addDays('2027-02-10', -14)).toBe('2027-01-27');
  });
});

describe('考試日期自動分配', () => {
  it('停止播種日是考前 14 天，今天和停止日都算', () => {
    expect(examDaysLeft('2026-11-10', '2027-02-10')).toBe(79);
    expect(examPerDay(1000, '2026-11-10', '2027-02-10')).toBe(13);
  });
  it('過了停止播種日就不再種', () => {
    expect(examPerDay(500, '2027-01-28', '2027-02-10')).toBe(0);
    expect(examPerDay(500, '2027-01-27', '2027-02-10')).toBe(500);
  });
  it('套用每天上限，澆水上限跟著調高', () => {
    const s = { ...DEFAULT_SETTINGS, planMode: 'exam' as const, examDate: '2027-02-10', examCap: 10 };
    expect(dailyQuota(s, 1000, '2026-11-10')).toBe(10);
    expect(reviewCap({ ...s, examCap: null }, 30)).toBe(240);
    expect(dailyQuota({ ...DEFAULT_SETTINGS, newPerDay: 15 }, 1000, '2026-11-10')).toBe(15);
  });
});

describe('各等級的新字比例', () => {
  const w = (id: string, level: Word['level'], content = true, extra: Partial<Word> = {}): Word => ({
    id, level, lemma: id, pos: 'other',
    senses: content ? [{ zh: '', en: '', ex: { de: '{x}', zh: '', en: '', distractors: [] } }] : undefined,
    ...extra,
  });
  const many = (level: Word['level'], n: number) => Array.from({ length: n }, (_, i) => w(`${level}-${i}`, level));
  const L = (A1: Amount, A2: Amount, B1: Amount): LevelPrefs => ({ A1, A2, B1 });
  const count = (ws: Word[], level: string) => ws.filter((x) => x.level === level).length;

  it('沒有內容的不種、已種的跳過、設成無的等級不種', () => {
    const words = [w('b1a', 'B1'), w('a2a', 'A2'), w('a1a', 'A1'), w('a1b', 'A1'), w('a1c', 'A1', false)];
    const order = seedOrder(words, L('high', 'high', 'high'), new Set(['a1b'])).map((x) => x.id);
    expect(order.sort()).toEqual(['a1a', 'a2a', 'b1a']);
    expect(seedOrder(words, L('none', 'none', 'high'), new Set()).map((x) => x.id)).toEqual(['b1a']);
  });
  it('高比中多：A1 高、A2 中、B1 中，新字大約六成是 A1', () => {
    const words = [...many('A1', 100), ...many('A2', 100), ...many('B1', 100)];
    const top = seedOrder(words, L('high', 'mid', 'mid'), new Set()).slice(0, 100);
    expect(count(top, 'A1')).toBeGreaterThan(48);
    expect(count(top, 'A1')).toBeLessThan(72);
    expect(count(top, 'A2')).toBeGreaterThan(10);
    expect(count(top, 'B1')).toBeGreaterThan(10);
  });
  it('字少的等級不會因為字少就被忽略：兩個都是高，A1 只有 30 個也會穩定出現', () => {
    const words = [...many('A1', 30), ...many('B1', 300)];
    const top = seedOrder(words, L('high', 'none', 'high'), new Set()).slice(0, 40);
    expect(count(top, 'A1')).toBeGreaterThan(9); // 約 16；A1 只有 30 個，抽著抽著會變少
    expect(count(top, 'A1')).toBeLessThan(25);
  });
  it('某個等級種完了，就由其他等級補上', () => {
    const words = [...many('A1', 5), ...many('A2', 20)];
    const planted = new Set(words.filter((x) => x.level === 'A1').map((x) => x.id));
    const order = seedOrder(words, L('high', 'mid', 'none'), planted);
    expect(order).toHaveLength(20);
    expect(count(order, 'A2')).toBe(20);
  });
  it('同樣的設定每次排出來的順序一樣', () => {
    const words = [...many('A1', 40), ...many('B1', 40)];
    const a = seedOrder(words, L('high', 'none', 'mid'), new Set()).map((x) => x.id);
    expect(seedOrder(words, L('high', 'none', 'mid'), new Set()).map((x) => x.id)).toEqual(a);
  });
  it('levelShares：高:中＝3:1，無的等級是 0，沒有字可種的等級不算', () => {
    const words = [...many('A1', 10), ...many('A2', 10), ...many('B1', 10)];
    expect(levelShares(words, L('high', 'mid', 'none'), new Set())).toEqual({ A1: 0.75, A2: 0.25, B1: 0 });
    const noA2 = new Set(words.filter((x) => x.level === 'A2').map((x) => x.id));
    expect(levelShares(words, L('high', 'mid', 'high'), noA2)).toEqual({ A1: 0.5, A2: 0, B1: 0.5 });
  });
  it('舊版種子袋換算成等級開關，沒有等級設定的舊存檔會自動轉換', () => {
    expect(levelsFromBag('A1+')).toEqual({ A1: 'high', A2: 'mid', B1: 'mid' });
    expect(levelsFromBag('A2+')).toEqual({ A1: 'none', A2: 'high', B1: 'mid' });
    expect(levelsFromBag('B1')).toEqual({ A1: 'none', A2: 'none', B1: 'high' });
    const old = mergeSettings({ onboarded: true, seedBag: 'B1' });
    expect(old.levels).toEqual({ A1: 'none', A2: 'none', B1: 'high' });
    expect('seedBag' in old).toBe(false);
    expect(mergeSettings({ levels: { A1: 'none', A2: 'high', B1: 'high' } }).levels.A2).toBe('high');
    expect(mergeSettings({}).levels).toEqual(DEFAULT_SETTINGS.levels);
  });
});

describe('成長階段', () => {
  const now = new Date('2026-11-10T10:00:00');
  const f = makeScheduler('standard');
  it('種子答對會發芽，不會則留在種子', () => {
    const c = newCard(now);
    expect(nextStage('seed', Rating.Good, f.next(c, now, Rating.Good).card)).toBe('sprout');
    expect(nextStage('seed', Rating.Again, f.next(c, now, Rating.Again).card)).toBe('seed');
  });
  it('結果答錯退回開花，模糊不長大', () => {
    const c = { ...newCard(now), state: State.Review, scheduled_days: 40 };
    expect(stageByInterval(c)).toBe('bush');
    expect(nextStage('bush', Rating.Again, c)).toBe('flower');
    expect(nextStage('flower', Rating.Hard, c)).toBe('flower');
  });
  it('一路答對最後會結果', () => {
    let c = newCard(now);
    let stage = nextStage('seed', Rating.Good, c);
    let t = now;
    for (let i = 0; i < 6; i++) {
      c = f.next(c, t, Rating.Good).card;
      stage = nextStage(stage, Rating.Good, c);
      t = c.due;
    }
    expect(stage).toBe('bush');
  });
  it('太簡單了：直接排到很久以後，考試日期會限制間隔', () => {
    const c = tooEasyCard(newCard(now), now);
    expect(c.state).toBe(State.Review);
    expect(Math.round((c.due.getTime() - now.getTime()) / 86_400_000)).toBe(30);
    const capped = tooEasyCard(newCard(now), now, 5);
    expect(Math.round((capped.due.getTime() - now.getTime()) / 86_400_000)).toBe(5);
  });
});

describe('德奧瑞地區偏好', () => {
  const mk = (id: string, extra: Partial<Word> = {}): Word => ({
    id, level: 'A1', lemma: id, pos: 'noun',
    senses: [{ zh: '', en: '', ex: { de: '{x}', zh: '', en: '', distractors: [] } }],
    ...extra,
  });
  const words = [
    mk('broetchen', { regions: ['D'] }),
    mk('semmel', { regions: ['A'] }),
    mk('broetli', { regions: ['CH'] }),
    mk('aufzug', { regions: ['D', 'A'] }),
    mk('billett', { variant_of: { word: 'Fahrkarte', regions: ['D', 'A'] } }),
    mk('briefumschlag', { variant_of: { word: 'Kuvert', regions: ['A'] } }),
    mk('haus'),
  ];
  const P = (D: Amount, A: Amount, CH: Amount): RegionPrefs => ({ D, A, CH });
  const ALL: LevelPrefs = { A1: 'high', A2: 'high', B1: 'high' };
  const ids = (p: RegionPrefs, planted: string[] = []) => seedOrder(words, ALL, new Set(planted), p).map((x) => x.id);

  it('wordRegions：自己的標記優先；只有「某地區用另一個字」的註記，就是其餘地區的說法；都沒有就是通用', () => {
    expect(wordRegions(words[0])).toEqual(['D']);
    expect(wordRegions(words[4])).toEqual(['CH']);
    expect(wordRegions(words[5])).toEqual(['D', 'CH']);
    expect(wordRegions(words[6])).toBeNull();
  });
  it('三地都高：全部都種', () => {
    expect(ids(P('high', 'high', 'high'))).toHaveLength(7);
  });
  it('奧地利、瑞士設無：只留德國用法和通用字，已種下的不受影響', () => {
    const p = P('high', 'none', 'none');
    expect(ids(p).sort()).toEqual(['aufzug', 'briefumschlag', 'broetchen', 'haus']);
    expect(remainingInBag(words, ALL, new Set(), p)).toBe(4);
    expect(regionAllows(words[1], p)).toBe(false);
  });
  it('多個地區都用的字，看最高的那個', () => {
    expect(wordLevel(words[3], P('none', 'high', 'none'))).toBe('high'); // aufzug：D、A 都用
    expect(wordLevel(words[3], P('none', 'mid', 'none'))).toBe('mid');
    expect(wordLevel(words[3], P('none', 'none', 'high'))).toBe('none');
  });
  it('設成中：都還會種，只是出現得比高少；通用字永遠不受影響', () => {
    expect(ids(P('high', 'mid', 'mid'))).toHaveLength(7);
    const general = Array.from({ length: 200 }, (_, i) => mk(`g${i}`));
    const austrian = Array.from({ length: 200 }, (_, i) => mk(`o${i}`, { regions: ['A'] }));
    const top = (a: Amount) => seedOrder([...general, ...austrian], ALL, new Set(), P('high', a, 'high')).slice(0, 100).filter((x) => x.id.startsWith('o')).length;
    expect(top('high')).toBeGreaterThan(top('mid') + 10);
    expect(top('mid')).toBeGreaterThan(8);
    expect(wordLevel(words[6], P('none', 'none', 'none'))).toBe('high');
  });
});
