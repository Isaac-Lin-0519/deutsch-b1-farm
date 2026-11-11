// 原創邊牧精靈圖（參考邊牧的特徵自己畫的）：四分之三側坐、半立耳、臉上白色流星、白圍脖、白襪、尾巴白尖
// 全部朝右畫，朝左時用 cached(..., flip) 鏡像
import type { Palette } from './pixel';

function setAt(rows: string[], y: number, x: number, s: string) {
  rows[y] = rows[y].slice(0, x) + s + rows[y].slice(x + s.length);
}

/** 把小圖蓋到大圖上（'.' 不蓋） */
function overlay(src: string[], part: string[], x: number, y: number): string[] {
  const rows = src.slice();
  part.forEach((r, j) => {
    [...r].forEach((ch, i) => {
      if (ch !== '.') setAt(rows, y + j, x + i, ch);
    });
  });
  return rows;
}

// 坐姿（朝右的四分之三側面）
export const SIT = [
  '...........kk...............',
  '..........kkkk......kkkk....',
  '..........kkKkk....kkKkkkk..',
  '...........kKkkkkkkwwkkkKk..',
  '..........kkkkkkkkkwwkkkk...',
  '..........kkkkKgEkkwwkgEk...',
  '..........kkkkkbEkwwwkbEk...',
  '..........kkkkkkkwwwwwwwk...',
  '..........kkkkkkkwwwwwnnww..',
  '...........kkkkkkwwwmmwww...',
  '............kkkkkkwwwwww....',
  '...........kkkkddwwwwwww....',
  '..........kkkkkkwwwwwwwwww..',
  '.........kkkkkwwwwwwwwwwwww.',
  '........kkKkkkkwwwwwwwwwwww.',
  '.......kkKKkkkwwwwwwwwwwwww.',
  '......kkKKkkkkkkwVwwwwwwwV..',
  '.....kkKkkkkkkkwwwwVwwwwww..',
  '....kkkkkkkkkkkkkwwwVwwwV...',
  '...kkkkkKKKkkkkkwwwwwwwww...',
  '..kkkkkkkkkKKkkkkwwVVwwww...',
  '..kkkkkkkkkkkKkkkwwVVwwww...',
  '..kkkkkkkkkkkkdkkww..wwww...',
  '..kkkkkkkkkkkkdkwww..wwww...',
  '..kkkkkkkkkkkkdwwww..wwww...',
  '...kkkkkkkkkkkdwwww..wwww...',
  '...kkkkkkwwwwwdwwww..wwwww..',
  '....kkkkwwtwtwdwtwtw.wtwtw..',
];

/** 兩隻眼睛左上角的位置（2×2） */
const EYES: [number, number][] = [
  [15, 5],
  [22, 5],
];

/** 閉眼：眼睛上半換成毛色，只留下面一條線 */
function closeEyes(src: string[], eyes = EYES): string[] {
  const rows = src.slice();
  for (const [x, y] of eyes) {
    setAt(rows, y, x, 'kk');
    setAt(rows, y + 1, x, 'EE');
  }
  return rows;
}

/** 叼著網球 */
export const BALL = overlay(SIT, ['.YY.', 'YyYY', 'YYYY', '.YY.'], 21, 9);

export const SIT_BLINK = closeEyes(SIT);
export const BALL_BLINK = closeEyes(BALL);

/** 趴著睡覺（下巴靠在前腳上） */
export const LIE = [
  '............kk..............',
  '...........kkkk......kkkk...',
  '...........kkKkk....kkKkkkk.',
  '...kkkkk....kKkkkkkkwwkkkKk.',
  '.kkkkkkkkk.kkkkkkkkkwwkkkk..',
  'kkkkkKKkkkkkkkkKkkkkwwkkkk..',
  'kkkkKKkkkkkkkkkkEEkwwwkEEk..',
  'kkkkkkkkkkkkkkkkkkwwwwwwwk..',
  'kkkkkkkkkkkkkkkkkkwwwwwnnww.',
  'kkkkkkkkkkkkkkkkkkwwwmmwww..',
  'wkkkkkkkkkkkkkkkkkkwwwwww...',
  'wwkkkkkkkkkkkkwwwwwwwwwwww..',
  'wwwkkkkkkkkwwwwwtwtwwwtwtw..',
];

/** 被從後頸拎起來：頭和坐姿一樣，身體垂下來、四隻腳懸空 */
export const HELD = [
  ...SIT.slice(0, 12),
  '..........kkkkkkwwwwwwwwww..',
  '.........kkkkkwwwwwwwwwwwww.',
  '.........kkKkkkwwwwwwwwwwww.',
  '.........kkKkkwwwwwwwwwwww..',
  '........kkkKkkkkwVwwwwwwV...',
  '........kkkkkkkkkwwVwwww....',
  '........kkkkkkkkkkwwwVww....',
  '........kkkkkkkkkkww.www....',
  '........kkkkkkkkkwww.www....',
  '........kkkkkkkkkwtw.wtw....',
  '........kkkkkkkkkww.........',
  '........kkkkkkkkkkw.........',
  '.....kkkkkkkKkkkkkk.........',
  '....kkkkkkkKkkkkkkk.........',
  '....kkk.kkkk..kkkk..........',
  '....kkk.kkkk..kkkk..........',
  '....kkw..kkk...kkk..........',
  '.....ww..www...www..........',
  '.....w...wtw...wtw..........',
];
/** 下半身晃向左、晃向右（拖動時腳會慢半拍） */
const SWING_FROM = 24;
export const HELD_L = HELD.map((r, j) => (j >= SWING_FROM ? r.slice(1) + '.' : r));
export const HELD_R = HELD.map((r, j) => (j >= SWING_FROM ? '.' + r.slice(0, -1) : r));
export const HELD_W = 28;
export const HELD_H = HELD.length;
/** 後頸（手抓的地方）在精靈圖上的位置（朝右時） */
export const SCRUFF_X = 10;
export const SCRUFF_Y = 11;

/** 坐姿的尾巴（拖在身後的地上），兩格輪流就是搖尾巴 */
export const TAIL_A = ['.........', '...kkkk..', '.kkkkkkkk', 'wwkkkkkkk', 'wwwkkkkkk', '.wwwkkkk.'];
export const TAIL_B = ['ww.......', 'wwkk.....', '.wkkkkk..', '..kkkkkkk', '...kkkkkk', '....kkkk.'];
export const TAIL_W = 9;
/** 尾巴相對於坐姿精靈圖左上角的位置（朝右時） */
export const TAIL_DX = -5;
export const TAIL_DY = 21;

// 側面走路（朝右）
const WALK_TOP = [
  '.................kk...........',
  '................kkkk..kkk.....',
  '................kkKkkkkKkw....',
  '................kkkkkkgEkww...',
  '................kkkkkkbEwwwww.',
  '................kkkkkkkwwwwnn.',
  '................kkkkkkwwwwwww.',
  '...............kkkkkkkwwwmmm..',
  'ww.....kkkkkkkkkkkkkwwwwww....',
  'wwkk.kkkkkkkkkkkkkkwwwwwww....',
  '.wkkkkkkkkkKKKkkkkkwwwwwww....',
  '..kkkkkkkkkkkkkkkkkkwwwwww....',
  '...kkkkkkkkkkkkkkkkkwwwww.....',
  '...kkkkkkkkkkkkkkkkkkkww......',
  '...kkkkkkkwwwwwwwkkkkkk.......',
];
export const WALK_A = [
  ...WALK_TOP,
  '..kkk...kkk......kkk.kkk......',
  '.kkk.....kkk.....kk...kkk.....',
  '.kk......kk......kk....kk.....',
  '.ww......ww......ww....ww.....',
  'www......www....www....www....',
];
export const WALK_B = [
  ...WALK_TOP,
  '...kkk..kkk......kkk.kkk......',
  '...kk...kk.......kk..kk.......',
  '...kk...kk.......kk..kk.......',
  '...ww...ww.......ww..ww.......',
  '...www..www......www.www......',
];

/** 各姿勢的大小（寬、高） */
export const SIT_W = 28;
export const SIT_H = 28;
export const WALK_W = 30;
export const WALK_H = 20;
export const LIE_W = 28;
export const LIE_H = 13;
/** 走路時嘴巴的位置（叼網球用），相對於朝右的精靈圖左上角 */
export const MOUTH_X = 25;
export const MOUTH_Y = 6;

export const DOG_PAL: Palette = {
  k: '#3a2e2b',
  K: '#57463f',
  d: '#2a201e',
  w: '#f4eddd',
  V: '#d6c9b6',
  E: '#140f0e',
  b: '#b9773f',
  g: '#ffffff',
  n: '#1a1414',
  m: '#9c8676',
  t: '#c4b5a2',
  Y: '#c8e04a',
  y: '#f4ffb0',
};
export const DOG_OUTLINE = '#1a1312';

export const TENNIS = ['.YY.', 'YyYW', 'YWYY', '.YY.'];
export const TENNIS_PAL: Palette = { Y: '#c8e04a', y: '#f4ffb0', W: '#f6f1e6' };
export const ZZ = ['ZZZ', '..Z', '.Z.', 'Z..', 'ZZZ'];
