import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, endOfDay } from '../src/lib/day';
import { dailyQuota, examDaysLeft, examPerDay, remainingInBag, reviewCap, seedOrder } from '../src/lib/plan';
import { outsideGermany, regionAllows } from '../src/lib/region';
import { makeScheduler, newCard, nextStage, Rating, stageByInterval, State, tooEasyCard } from '../src/lib/srs';
import { DEFAULT_SETTINGS, type Word } from '../src/lib/types';

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

describe('種子袋', () => {
  const w = (id: string, level: Word['level'], content = true): Word => ({
    id, level, lemma: id, pos: 'other',
    senses: content ? [{ zh: '', en: '', ex: { de: '{x}', zh: '', en: '', distractors: [] } }] : undefined,
  });
  const words = [w('b1a', 'B1'), w('a2a', 'A2'), w('a1a', 'A1'), w('a1b', 'A1'), w('a1c', 'A1', false), w('a2b', 'A2')];
  it('低等級先種，沒有內容的不種，已種的跳過', () => {
    const order = seedOrder(words, 'A1+', new Set(['a1b'])).map((x) => x.id);
    expect(order[0]).toBe('a1a');
    expect(order.slice(1, 3).sort()).toEqual(['a2a', 'a2b']);
    expect(order[3]).toBe('b1a');
    expect(order).not.toContain('a1c');
  });
  it('只種 B1', () => {
    expect(seedOrder(words, 'B1', new Set()).map((x) => x.id)).toEqual(['b1a']);
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
  const ids = (r: 'all' | 'later' | 'de', planted: string[] = []) => seedOrder(words, 'A1+', new Set(planted), r).map((x) => x.id);

  it('outsideGermany：沒有 D 標記、或註記說德國用另一個字的，才算奧瑞說法', () => {
    expect(words.filter(outsideGermany).map((x) => x.id)).toEqual(['semmel', 'broetli', 'billett']);
  });
  it('全練：都種', () => {
    expect(ids('all')).toHaveLength(7);
  });
  it('只練德國用法：奧瑞說法不種，已經種下的不受影響', () => {
    expect(ids('de').sort()).toEqual(['aufzug', 'briefumschlag', 'broetchen', 'haus']);
    expect(remainingInBag(words, 'A1+', new Set(), 'de')).toBe(4);
    expect(regionAllows(words[1], 'de')).toBe(false);
  });
  it('奧瑞說法最後才種：全部還是會種，只是排在後面', () => {
    const o = ids('later');
    expect(o).toHaveLength(7);
    expect(o.slice(-3).sort()).toEqual(['billett', 'broetli', 'semmel']);
  });
});
