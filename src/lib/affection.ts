// 邊牧好感度：只會增加，用心形顯示，滿一顆心就學會一個新動作

/** 第 1～5 顆心需要的好感度 */
export const HEART_AT = [5, 15, 35, 70, 120];
export const MAX_HEARTS = HEART_AT.length;

export const PET_GAIN = 1;
export const PET_PER_DAY = 3;
export const FEED_GAIN = 2;
export const FEED_PER_DAY = 10;
export const WATER_GAIN = 3;

/** 每天的照顧紀錄，換日就歸零 */
export interface Care {
  day: string;
  pets: number;
  fed: number;
  watered: boolean;
}

export function freshCare(care: Care | undefined, day: string): Care {
  return care && care.day === day ? care : { day, pets: 0, fed: 0, watered: false };
}

export function hearts(affection: number): number {
  return HEART_AT.filter((t) => affection >= t).length;
}

/** 到下一顆心還差多少；滿心回傳 null */
export function toNextHeart(affection: number): number | null {
  const next = HEART_AT.find((t) => affection < t);
  return next === undefined ? null : next - affection;
}

export type Trick = 'fetch' | 'window' | 'greet' | 'follow' | 'throw';

export const TRICKS: { heart: number; id: Trick; label: string }[] = [
  { heart: 1, id: 'fetch', label: '自己叼網球玩' },
  { heart: 2, id: 'window', label: '坐在窗邊看外面' },
  { heart: 3, id: 'greet', label: '你回家時跑來迎接' },
  { heart: 4, id: 'follow', label: '點地板，牠會走過去' },
  { heart: 5, id: 'throw', label: '點網球丟給牠撿' },
];

export function knows(affection: number, trick: Trick): boolean {
  const t = TRICKS.find((x) => x.id === trick)!;
  return hearts(affection) >= t.heart;
}
