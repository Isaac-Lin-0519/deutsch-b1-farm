// 連接詞與文法練習：資料格式、出題與對答案（不碰畫面和儲存，方便測試）
import type { Card } from 'ts-fsrs';

export type GroupId = 'sub' | 'adv' | 'pair' | 'zu' | 'rel' | 'gen';

export const GROUPS: { id: GroupId; zh: string }[] = [
  { id: 'sub', zh: '動詞放最後的連接詞' },
  { id: 'adv', zh: '連接副詞' },
  { id: 'pair', zh: '雙連接詞' },
  { id: 'zu', zh: 'zu＋不定式' },
  { id: 'rel', zh: '關係代名詞' },
  { id: 'gen', zh: '屬格介系詞' },
];
export const groupName = (id: GroupId) => GROUPS.find((g) => g.id === id)?.zh ?? id;

/** 德文句子裡 {…} 標出這題的重點（連接詞、關代…），[…] 標出動詞的位置 */
export interface GEx {
  de: string;
  zh: string;
  en: string;
}

/** 四選一：{…} 是要填的空格，options 是 3 個錯的選項 */
export interface ChoiceItem extends GEx {
  type: 'choice';
  options: string[];
  why: string;
}

/** 排語序：lead 是固定的前半句，tokens 是正確順序的字塊 */
export interface OrderItem {
  type: 'order';
  lead: string;
  tokens: string[];
  /** 句尾標點，預設句點 */
  tail?: string;
  /** 其他也算對的順序 */
  alt?: string[][];
  zh: string;
  en: string;
  why: string;
}

export type GItem = ChoiceItem | OrderItem;

export interface GPoint {
  id: string;
  group: GroupId;
  de: string;
  /** 語序小標記，例如「obwohl ＋ …動詞」 */
  pattern: string;
  zh: string;
  en: string;
  /** 有 ask 和 forms 的是「看規則」的卡片（關代、屬格介系詞） */
  ask?: string;
  forms?: [string, string][];
  rule: string;
  ex: GEx;
  items: GItem[];
}

export type GKind = 'card' | 'choice' | 'order';

/** 一個文法點的複習進度 */
export interface GRecord {
  id: string;
  c: Card;
  /** 出現過幾次，用來輪流換題型和例句 */
  seen: number;
  wrong: number;
  startedAt: number;
}

export interface GLog {
  n?: number;
  id: string;
  ts: number;
  rating: number;
  kind: GKind;
  isNew: boolean;
}

export interface GDaily {
  day: string;
  /** 今天開始學的新文法點 */
  started: number;
  /** 今天自己按「再學新的」多要的額度 */
  extra: number;
}

/** 每天自動帶出的新文法點；想多學可以在練完後再要 */
export const GRAMMAR_NEW_PER_DAY = 3;

// ---- 句子標記 ----
export type Seg = { t: string; k: 'text' | 'key' | 'verb' };

export function segments(de: string): Seg[] {
  return de
    .split(/(\{[^}]*\}|\[[^\]]*\])/)
    .filter(Boolean)
    .map((t) => (t[0] === '{' ? { t: t.slice(1, -1), k: 'key' } : t[0] === '[' ? { t: t.slice(1, -1), k: 'verb' } : { t, k: 'text' }));
}

export const plain = (de: string) => de.replace(/[{}[\]]/g, '');

export function answerOf(de: string): string {
  return /\{([^}]*)\}/.exec(de)?.[1] ?? '';
}

/** 排語序題的完整句子（保留標記） */
export function orderSentence(it: OrderItem): string {
  return `${it.lead} ${it.tokens.join(' ')}${it.tail ?? '.'}`;
}

export function checkOrder(it: OrderItem, picked: string[]): boolean {
  const key = (xs: string[]) => xs.map(plain).join(' ');
  const got = key(picked);
  return got === key(it.tokens) || (it.alt ?? []).some((a) => key(a) === got);
}

// ---- 出題 ----
export type Exercise = { kind: 'card' } | { kind: 'choice'; item: ChoiceItem } | { kind: 'order'; item: OrderItem };

function asExercise(it: GItem): Exercise {
  return it.type === 'choice' ? { kind: 'choice', item: it } : { kind: 'order', item: it };
}

/**
 * 沒學過的先看閃卡；之後照順序輪流出題，全部出過一輪再看一次閃卡。
 * 這樣同一個文法點每次複習看到的句子都不一樣。
 */
export function pickExercise(p: GPoint, rec?: Pick<GRecord, 'seen'>): Exercise {
  if (!rec || rec.seen <= 0) return { kind: 'card' };
  const i = (rec.seen - 1) % (p.items.length + 1);
  return i < p.items.length ? asExercise(p.items[i]) : { kind: 'card' };
}

/** 隨意練習：隨機抽一題（不出閃卡） */
export function randomExercise(p: GPoint, rnd: () => number = Math.random): Exercise {
  return asExercise(p.items[Math.floor(rnd() * p.items.length)]);
}

export function shuffled<T>(xs: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

export function choiceOptions(it: ChoiceItem, rnd: () => number = Math.random): string[] {
  return shuffled([answerOf(it.de), ...it.options], rnd);
}

/** 打亂字塊，而且不會剛好排成正確答案 */
export function scrambled(it: OrderItem, rnd: () => number = Math.random): string[] {
  const clean = it.tokens.map(plain);
  for (let n = 0; n < 20; n++) {
    const s = shuffled(clean, rnd);
    if (!checkOrder(it, s)) return s;
  }
  return [...clean].reverse();
}

// ---- 進度 ----
/** 複習間隔拉到一週以上就算熟練 */
export const mastered = (r: GRecord) => r.c.scheduled_days >= 7;

// ---- 內容檢查（測試會跑，內容寫錯就不能部署） ----
const one = (s: string, open: string, close: string) => s.split(open).length === 2 && s.split(close).length === 2;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function validatePoints(points: GPoint[]): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const groups = new Set(GROUPS.map((g) => g.id));
  for (const p of points) {
    const at = (m: string) => errs.push(`${p.id}：${m}`);
    if (!text(p.id) || ids.has(p.id)) at('id 空白或重複');
    ids.add(p.id);
    if (!groups.has(p.group)) at(`不認得的組別 ${p.group}`);
    for (const k of ['de', 'pattern', 'zh', 'en', 'rule'] as const) if (!text(p[k])) at(`缺 ${k}`);
    if (!!p.ask !== !!p.forms) at('ask 和 forms 要一起出現');
    if (p.forms && !p.forms.every((f) => f.length === 2 && f.every(text))) at('forms 每列要有兩格');
    if (!p.ex || !text(p.ex.zh) || !text(p.ex.en) || !one(p.ex.de ?? '', '{', '}')) at('例句要三語，而且剛好一組 {}');
    if (!p.items?.length) at('沒有題目');
    p.items?.forEach((it, i) => {
      const q = (m: string) => at(`第 ${i + 1} 題${m}`);
      if (!text(it.zh) || !text(it.en) || !text(it.why)) q('缺翻譯或解釋');
      if (it.type === 'choice') {
        if (!one(it.de, '{', '}')) return q('要剛好一組 {}');
        const ans = answerOf(it.de);
        if (it.options?.length !== 3) q('要剛好 3 個干擾選項');
        if (new Set([ans, ...(it.options ?? [])]).size !== 4) q('選項重複或和答案一樣');
        const cap = (s: string) => /^\p{Lu}/u.test(s);
        if (it.de.startsWith('{') && !it.options.every(cap)) q('句首的選項要大寫開頭');
      } else if (it.type === 'order') {
        if (!text(it.lead)) q('缺 lead');
        if (!it.tokens || it.tokens.length < 3) q('至少要 3 個字塊');
        if (new Set(it.tokens?.map(plain)).size !== it.tokens?.length) q('字塊重複');
        const sorted = (xs: string[]) => xs.map(plain).sort().join('|');
        if (it.alt?.some((a) => sorted(a) !== sorted(it.tokens))) q('alt 的字塊和 tokens 不一致');
      } else q('不認得的題型');
    });
  }
  return errs;
}
