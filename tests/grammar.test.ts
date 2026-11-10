import { describe, expect, it } from 'vitest';
import {
  answerOf,
  checkOrder,
  choiceOptions,
  GROUPS,
  mastered,
  orderSentence,
  pickExercise,
  plain,
  scrambled,
  segments,
  validatePoints,
  type ChoiceItem,
  type GPoint,
  type GRecord,
  type OrderItem,
} from '../src/lib/grammar';
import { isLearning, makeScheduler, newCard, Rating } from '../src/lib/srs';

const files = import.meta.glob<{ default: GPoint[] }>('../data/grammar/g*.json', { eager: true });
const points: GPoint[] = Object.keys(files)
  .sort()
  .flatMap((k) => files[k].default);

describe('文法內容', () => {
  it('格式都對', () => {
    expect(validatePoints(points)).toEqual([]);
  });
  it('第一批的文法點都在，組別都認得', () => {
    const ids = points.map((p) => p.id);
    for (const id of ['weil', 'obwohl', 'deshalb', 'trotzdem', 'wegen', 'trotz', 'um-zu', 'damit', 'rel-nom', 'rel-akk', 'rel-dat'])
      expect(ids).toContain(id);
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const p of points) expect(groups.has(p.group)).toBe(true);
  });
  it('每個文法點都有四選一和排語序', () => {
    for (const p of points) {
      expect(p.items.some((i) => i.type === 'choice'), p.id).toBe(true);
      expect(p.items.some((i) => i.type === 'order'), p.id).toBe(true);
    }
  });
  it('檢查抓得到寫錯的內容', () => {
    const bad = structuredClone(points[0]);
    (bad.items[0] as ChoiceItem).options = ['deshalb', 'weil'];
    (bad.items[1] as OrderItem).tokens = ['sie', 'sie', '[hat]'];
    expect(validatePoints([bad]).length).toBe(3);
  });
});

describe('句子標記', () => {
  it('{} 是重點，[] 是動詞', () => {
    expect(segments('Ich bleibe, {weil} ich krank [bin].')).toEqual([
      { t: 'Ich bleibe, ', k: 'text' },
      { t: 'weil', k: 'key' },
      { t: ' ich krank ', k: 'text' },
      { t: 'bin', k: 'verb' },
      { t: '.', k: 'text' },
    ]);
    expect(plain('{um} dort [zu] [kaufen]')).toBe('um dort zu kaufen');
    expect(answerOf('Wegen {des} Wetters')).toBe('des');
  });
});

describe('出題', () => {
  const p = points.find((x) => x.id === 'weil')!;
  it('沒學過先看閃卡，之後照順序輪流，出完一輪再看一次閃卡', () => {
    expect(pickExercise(p).kind).toBe('card');
    const kinds = Array.from({ length: p.items.length + 2 }, (_, i) => pickExercise(p, { seen: i + 1 }));
    expect(kinds.slice(0, p.items.length).map((e) => e.kind)).toEqual(p.items.map((i) => i.type));
    expect(kinds[p.items.length].kind).toBe('card');
    expect(kinds[p.items.length + 1]).toEqual({ kind: 'choice', item: p.items[0] });
  });
  it('四選一有答案和 3 個干擾選項', () => {
    const it0 = p.items[0] as ChoiceItem;
    const opts = choiceOptions(it0);
    expect(opts.length).toBe(4);
    expect(opts).toContain('weil');
  });
  it('排語序：打亂後不會剛好是答案，標記不影響對答案', () => {
    const o = p.items.find((i) => i.type === 'order') as OrderItem;
    for (let n = 0; n < 30; n++) {
      const s = scrambled(o);
      expect([...s].sort()).toEqual(o.tokens.map(plain).sort());
      expect(checkOrder(o, s)).toBe(false);
    }
    expect(checkOrder(o, o.tokens.map(plain))).toBe(true);
    expect(orderSentence(o)).toBe('Lena geht früh ins Bett, {weil} sie morgen eine Prüfung [hat].');
    expect(checkOrder({ ...o, alt: [['[hat]', 'sie', 'morgen eine Prüfung']] }, ['hat', 'sie', 'morgen eine Prüfung'])).toBe(true);
  });
});

describe('文法的複習排程', () => {
  it('新文法點看完閃卡還在學習中，再答對一題就排到之後幾天', () => {
    const f = makeScheduler('standard');
    const now = new Date(2026, 10, 11, 10);
    const a = f.next(newCard(now), now, Rating.Good).card;
    expect(isLearning(a)).toBe(true);
    const b = f.next(a, new Date(now.getTime() + 60_000), Rating.Good).card;
    expect(isLearning(b)).toBe(false);
    expect(b.scheduled_days).toBeGreaterThanOrEqual(1);
    const rec: GRecord = { id: 'weil', c: b, seen: 2, wrong: 0, startedAt: 0 };
    expect(mastered(rec)).toBe(false);
    expect(mastered({ ...rec, c: { ...b, scheduled_days: 9 } })).toBe(true);
  });
});
