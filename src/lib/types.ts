import type { Card } from 'ts-fsrs';
import type { Care } from './affection';

export type Level = 'A1' | 'A2' | 'B1';
export const LEVELS: Level[] = ['A1', 'A2', 'B1'];
export type Pos = 'noun' | 'verb' | 'other';

export interface Example {
  de: string; // 剛好一個 {答案}
  zh: string;
  en: string;
  distractors: string[];
}

export interface Sense {
  zh: string;
  en: string;
  ex: Example;
}

export interface Word {
  id: string;
  level: Level;
  lemma: string;
  pos: Pos;
  articles?: string[];
  plural?: string;
  number?: string;
  present3?: string;
  praeteritum?: string;
  perfekt?: string;
  aux?: string;
  prep?: string;
  regions?: string[];
  variant_of?: { word: string; regions: string[] };
  extra?: string;
  senses?: Sense[];
}

export type Stage = 'seed' | 'sprout' | 'seedling' | 'flower' | 'bush';
export const STAGE_NAMES: Record<Stage, string> = {
  seed: '種子',
  sprout: '發芽',
  seedling: '幼苗',
  flower: '開花',
  bush: '結果',
};

export type FruitKind = 'der' | 'die' | 'das' | 'other';
export type Pace = 'easy' | 'standard' | 'sprint';
/** 從哪個等級開始種，種完再往上 */
export type SeedBag = 'A1+' | 'A2+' | 'B1';
export type Direction = 'de2x' | 'x2de';
export type HintLang = 'zh' | 'en' | 'both';

export interface Settings {
  onboarded: boolean;
  planMode: 'fixed' | 'exam';
  newPerDay: number;
  examDate: string | null; // YYYY-MM-DD
  examCap: number | null; // 考試模式每天最多幾個新字
  reviewCap: number;
  pace: Pace;
  seedBag: SeedBag;
  direction: Direction;
  hintLang: HintLang;
  autoSpeak: boolean;
  /** 邊牧的名字，第一次使用時由使用者取 */
  dogName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  planMode: 'fixed',
  newPerDay: 10,
  examDate: null,
  examCap: null,
  reviewCap: 100,
  pace: 'standard',
  seedBag: 'A1+',
  direction: 'de2x',
  hintLang: 'both',
  autoSpeak: false,
  dogName: '',
};

/** 田裡的一株作物＝一個已經種下的字 */
export interface CardRecord {
  id: string;
  c: Card;
  stage: Stage;
  plantedAt: number;
  wrong: number; // 按「不會」的總次數
}

export interface ReviewLog {
  n?: number;
  id: string;
  ts: number;
  rating: number; // ts-fsrs Rating：1 不會、2 模糊、3 記得、4 太簡單
  isNew: boolean;
  stage: Stage; // 評分後的階段
}

export interface Daily {
  day: string;
  quota: number; // 今天要種的新字數
  planted: number;
  reviewed: number; // 今天澆過水的排程複習數（不含新字）
}

export interface Profile {
  fruits: Record<FruitKind, number>;
  /** 邊牧好感度，只會增加 */
  affection: number;
  care: Care;
}

export function defaultProfile(): Profile {
  return { fruits: { der: 0, die: 0, das: 0, other: 0 }, affection: 0, care: { day: '', pets: 0, fed: 0, watered: false } };
}
