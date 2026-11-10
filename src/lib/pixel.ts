// 像素繪圖：1 個美術像素 = S 個畫布像素；文字用俐方體 11 號，畫布像素座標，二值化後不會糊
import type { FruitKind, Stage } from './types';

export const S = 2;
export type Ctx = CanvasRenderingContext2D;
export type Palette = Record<string, string>;

export const OUT = '#2b1a10';
export const INK = '#3a2414';
export const RED_INK = '#c0392b';
export const LABEL = '#fffbe8';
export const LABEL_SHADOW = '#24451a';

export function rect(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(x * S, y * S, w * S, h * S);
}

export function px(c: Ctx, x: number, y: number, col: string) {
  rect(c, x, y, 1, 1, col);
}

/** 字串陣列畫成精靈圖，outline 會自動描 1px 外框 */
export function sprite(c: Ctx, rows: string[], x: number, y: number, pal: Palette, outline?: string | null) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const on = (i: number, j: number) => j >= 0 && j < h && i >= 0 && i < rows[j].length && rows[j][i] !== '.' && !!pal[rows[j][i]];
  if (outline) {
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (on(i, j)) continue;
        if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) px(c, x + i, y + j, outline);
      }
  }
  for (let j = 0; j < h; j++)
    for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch !== '.' && pal[ch]) px(c, x + i, y + j, pal[ch]);
    }
}

/** 先把精靈圖畫成小圖存起來，每一格動畫直接貼上（含 1px 外框的空間） */
const sprites = new Map<string, HTMLCanvasElement>();
export function cached(key: string, rows: string[], pal: Palette, outline?: string | null, flip = false): HTMLCanvasElement {
  const k = flip ? `${key}~` : key;
  const hit = sprites.get(k);
  if (hit) return hit;
  const w = Math.max(...rows.map((r) => r.length));
  let r = rows.map((x) => x.padEnd(w, '.'));
  if (flip) r = r.map((x) => [...x].reverse().join(''));
  const o = document.createElement('canvas');
  o.width = (w + 2) * S;
  o.height = (r.length + 2) * S;
  sprite(o.getContext('2d')!, r, 1, 1, pal, outline);
  sprites.set(k, o);
  return o;
}

/** 貼上 cached() 的小圖，x、y 是精靈圖左上角的美術像素座標 */
export function blit(c: Ctx, img: HTMLCanvasElement, x: number, y: number) {
  c.drawImage(img, (Math.round(x) - 1) * S, (Math.round(y) - 1) * S);
}

/** 圓角小框（深色外框＋底色） */
export function box(c: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  rect(c, x, y + 1, w, h - 2, OUT);
  rect(c, x + 1, y, w - 2, h, OUT);
  rect(c, x + 1, y + 1, w - 2, h - 2, fill);
}

// ---- 文字 ----
const FONT = '12px Cubic11';
let off: HTMLCanvasElement | null = null;
const cache = new Map<string, HTMLCanvasElement>();

function hex(c: string) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

export function textWidth(str: string): number {
  off ??= document.createElement('canvas');
  const ox = off.getContext('2d')!;
  ox.font = FONT;
  return Math.ceil(ox.measureText(str).width) + 2;
}

/** 把文字畫成只有實心像素的小圖（alpha ≥ 120 才算有墨） */
export function bitmap(str: string, col: string): HTMLCanvasElement {
  const key = `${col}|${str}`;
  const hit = cache.get(key);
  if (hit) return hit;
  off ??= document.createElement('canvas');
  const w = textWidth(str);
  off.width = w;
  off.height = 16;
  const ox = off.getContext('2d', { willReadFrequently: true })!;
  ox.font = FONT;
  ox.textBaseline = 'top';
  ox.fillStyle = '#000';
  ox.fillText(str, 1, 1);
  const src = ox.getImageData(0, 0, w, 16);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = 16;
  const oc = out.getContext('2d')!;
  const d = oc.createImageData(w, 16);
  const [r, g, b] = hex(col);
  for (let i = 0; i < src.data.length; i += 4) {
    if (src.data[i + 3] >= 120) {
      d.data[i] = r;
      d.data[i + 1] = g;
      d.data[i + 2] = b;
      d.data[i + 3] = 255;
    }
  }
  oc.putImageData(d, 0, 0);
  if (cache.size > 600) cache.clear();
  cache.set(key, out);
  return out;
}

/** x、y 是畫布像素座標 */
export function ptext(c: Ctx, str: string, x: number, y: number, col: string, shadow?: string | null, align: 'left' | 'center' | 'right' = 'left') {
  const m = bitmap(str, col);
  let X = x;
  if (align === 'center') X = Math.round(x - m.width / 2);
  if (align === 'right') X = x - m.width;
  c.imageSmoothingEnabled = false;
  if (shadow) c.drawImage(bitmap(str, shadow), X + 1, y + 1);
  c.drawImage(m, X, y);
}

/** 太長的字截斷加「…」 */
export function fit(str: string, maxW: number): string {
  if (textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && textWidth(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

// ---- 場景元件 ----
export function panel(c: Ctx, x: number, y: number, w: number, h: number) {
  rect(c, x, y + 1, w, h - 2, OUT);
  rect(c, x + 1, y, w - 2, h, OUT);
  rect(c, x + 1, y + 1, w - 2, h - 2, '#9a5a28');
  rect(c, x + 1, y + 1, w - 2, 1, '#d08a46');
  rect(c, x + 1, y + h - 2, w - 2, 1, '#6e3c18');
  rect(c, x + 3, y + 3, w - 6, h - 6, '#5a3214');
  rect(c, x + 4, y + 4, w - 8, h - 8, '#f3dcaa');
  rect(c, x + 4, y + 4, w - 8, 1, '#e2c38a');
  for (const [a, b] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) px(c, a, b, '#f0c878');
}

/** 小木牌按鈕（分頁、箭頭） */
export function tab(c: Ctx, x: number, y: number, w: number, h: number, active: boolean) {
  rect(c, x, y + 1, w, h - 2, OUT);
  rect(c, x + 1, y, w - 2, h, OUT);
  rect(c, x + 1, y + 1, w - 2, h - 2, active ? '#f3dcaa' : '#9a5a28');
  rect(c, x + 1, y + 1, w - 2, 1, active ? '#fff4d6' : '#d08a46');
  rect(c, x + 1, y + h - 2, w - 2, 1, active ? '#e2c38a' : '#6e3c18');
}

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

export function grass(c: Ctx, w: number, h: number, seed = 7) {
  const rnd = rng(seed);
  rect(c, 0, 0, w, h, '#6aa83c');
  const n = Math.round((w * h) / 60);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), t = rnd();
    if (t < 0.45) { px(c, x, y, '#5c9634'); px(c, x + 1, y - 1, '#5c9634'); }
    else if (t < 0.8) { px(c, x, y, '#82c04c'); px(c, x, y - 1, '#9ad35a'); }
    else px(c, x, y, '#4f8a2c');
  }
}

export function soil(c: Ctx, x: number, y: number, dry: boolean, empty = false) {
  const A = empty
    ? ['#5f4a33', '#7a6146', '#8f7556', '#6a543a']
    : dry
      ? ['#7d5a36', '#9a7448', '#b48c5c', '#8a6640']
      : ['#4e2f1a', '#6c4226', '#875632', '#5a371f'];
  rect(c, x, y + 1, 16, 14, OUT);
  rect(c, x + 1, y, 14, 16, OUT);
  rect(c, x + 1, y + 1, 14, 14, A[1]);
  rect(c, x + 1, y + 1, 14, 1, A[2]);
  for (let r = 4; r < 15; r += 4) {
    rect(c, x + 1, y + r, 14, 1, A[0]);
    rect(c, x + 2, y + r - 1, 12, 1, A[3]);
  }
  if (dry && !empty) {
    for (const [a, b] of [[4, 6], [5, 7], [10, 10], [11, 9]]) px(c, x + a, y + b, '#6a4a2a');
  }
}

const LEAF: Palette = { L: '#2f6b2a', M: '#4f9a3a', H: '#7cc552', s: '#2f6b2a', y: '#fff3b0', Y: '#f0a030', b: '#4a2c14', w: '#b8a24c', W: '#8a7a32' };

export const SPR: Record<Stage | 'wilt', string[]> = {
  seed: ['..bb..', '.bbbb.'],
  sprout: ['.HH.HH.', 'HMMsMMH', '.MMsMM.', '...s...', '...s...'],
  seedling: ['....H....', '...HMH...', 'HH..s..HH', 'HMM.s.MMH', '.MMMsMMM.', '....s....', '..HMsMH..', '...MsM...', '....s....'],
  flower: ['...yyy...', '..yyYyy..', '..yYYYy..', '..yyYyy..', '...yyy...', '....s....', '.HM.s.MH.', 'HMMMsMMMH', '.MM.s.MM.', '....s....', '...MsM...', '....s....'],
  bush: ['....HHHHH....', '..HHMMMMMHH..', '.HMMFfMMMMMH.', '.MMMFFMMFfMM.', 'HMMMMMMMFFMMH', 'MMFfMMMMMMMMM', 'MMFFMMMFfMMMM', '.MMMMMMFFMMM.', '..LMMMMMMML..', '...LLsLsLL...', '.....s.s.....'],
  wilt: ['..W......', '...w.....', '....wW...', 'ww..w.ww.', '.www.ww..', '....w....', '....w....'],
};

/** der 藍莓、die 番茄、das 黃綠色果實；不是名詞的字用杏桃色 */
export const FRUIT: Record<FruitKind, [string, string]> = {
  der: ['#3050c0', '#86a6ff'],
  die: ['#c8352e', '#ff8a6a'],
  das: ['#b8d040', '#fbffd0'],
  other: ['#e07a1f', '#ffc27a'],
};

/** 在一格土（16×16）上畫作物 */
export function crop(c: Ctx, stage: Stage | 'wilt', x: number, y: number, fruit: FruitKind = 'other') {
  const rows = SPR[stage];
  const w = rows[0].length;
  const pal: Palette = { ...LEAF, F: FRUIT[fruit][0], f: FRUIT[fruit][1] };
  sprite(c, rows, x + 8 - Math.floor(w / 2), y + 12 - rows.length, pal, stage === 'seed' ? null : '#1b3317');
}

export function drop(c: Ctx, x: number, y: number) {
  sprite(c, ['..D..', '.DDD.', 'DDDDD', 'DdDDD', 'DddDD', '.DDD.'], x, y, { D: '#3d7fd9', d: '#bfe2ff' }, '#0e2a55');
}

export const BASKET = ['..F.f..R..', 'FfFRrRfGg.', 'BBBBBBBBBB', 'BbBbBbBbBB', 'BBBBBBBBBB', '.BbBbBbBB.', '..BBBBBB..'];
export const BPAL: Palette = { B: '#9a5a28', b: '#c98444', F: '#3050c0', f: '#86a6ff', R: '#c8352e', r: '#ff8a6a', G: '#b8d040', g: '#fbffd0' };

export function fence(c: Ctx, y: number, w: number) {
  rect(c, 0, y + 3, w, 2, OUT);
  rect(c, 0, y + 3, w, 1, '#c98444');
  rect(c, 0, y + 8, w, 2, OUT);
  rect(c, 0, y + 8, w, 1, '#c98444');
  for (let x = 2; x < w; x += 14) {
    rect(c, x, y, 4, 13, OUT);
    rect(c, x + 1, y + 1, 2, 11, '#b8743a');
    px(c, x + 1, y + 1, '#e0a060');
  }
}

export function flowers(c: Ctx, spots: [number, number, string][]) {
  for (const [x, y, col] of spots) {
    px(c, x, y - 1, col); px(c, x - 1, y, col); px(c, x + 1, y, col); px(c, x, y + 1, col);
    px(c, x, y, '#f0a030'); px(c, x, y + 2, '#2f6b2a');
  }
}

export function arrow(c: Ctx, x: number, y: number, dir: 'left' | 'right', col: string) {
  const rows = dir === 'right' ? ['D..', 'DD.', 'DDD', 'DD.', 'D..'] : ['..D', '.DD', 'DDD', '.DD', '..D'];
  sprite(c, rows, x, y, { D: col });
}

/** 果實小圖示（籃子旁、卡片上） */
export function fruitIcon(c: Ctx, x: number, y: number, kind: FruitKind) {
  sprite(c, ['..L.', '.FF.', 'FfFF', 'FFFF', '.FF.'], x, y, { F: FRUIT[kind][0], f: FRUIT[kind][1], L: '#4f9a3a' }, OUT);
}
