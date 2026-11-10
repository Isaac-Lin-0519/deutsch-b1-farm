// 原創邊牧精靈圖（參考邊牧的特徵自己畫的）：垂耳內側粉紅、大眼睛有亮點、吐舌笑、白胸毛、白腳掌
import type { Palette } from './pixel';

function mirror(half: string[]): string[] {
  return half.map((r) => r + [...r].reverse().join(''));
}

function setAt(rows: string[], y: number, x: number, s: string) {
  rows[y] = rows[y].slice(0, x) + s + rows[y].slice(x + s.length);
}

/** 閉眼：兩隻眼睛換成彎彎的線 */
function closeEyes(src: string[]): string[] {
  const rows = src.slice();
  for (const x of [7, 18]) {
    setAt(rows, 6, x, 'kkk');
    setAt(rows, 7, x, 'LkL');
    setAt(rows, 8, x, 'kLk');
  }
  return rows;
}

// 正面坐姿，先畫左半邊再鏡像
const SIT_HALF = [
  '.......kkkkkkk',
  '.....kkkkkkkkk',
  '.kkkkkKkkkkkkk',
  'kKKKKkkkkkkkkw',
  'kKrrrKkkkkkkkw',
  '.kkrrrkkkkkkww',
  '..kkrrkgEEkkww',
  '...kkkkEEEkwww',
  '.....kkEEEkwww',
  '.....kkkkkkwww',
  '.....kkkkkwwww',
  '......kkwwwwnn',
  '......kkwwwwnn',
  '......kwwmwwwm',
  '.......kwwmmmp',
  '.......kVwwwpp',
  '......kkVVwwwp',
  '.....kkkkVVwww',
  '....kkkkwwwwww',
  '...kkkkwwwwwww',
  '...kkKkwwwwwVV',
  '..kkKkkwwwwwVw',
  '..kkkkkwwwwwVw',
  '.kkkkkkkwwwwVk',
  '.kkkkkkwwwwwwk',
  'wwkkkkkwwwwwwk',
  'wtwkkkwwtwtwwk',
  '.ww...wwwwwww.',
];

export const SIT = mirror(SIT_HALF);
setAt(SIT, 6, 18, 'gEE'); // 右眼亮點也在左上
setAt(SIT, 11, 12, 'N'); // 鼻子亮點

/** 叼著網球 */
export const BALL = SIT.slice();
['....YYYY....', '...YyYYYY...', '...YYYYYY...', '....YYYY....'].forEach((r, i) => {
  const y = 13 + i;
  BALL[y] = [...BALL[y]].map((ch, x) => (r[x - 8] && r[x - 8] !== '.' ? r[x - 8] : ch)).join('');
});

export const SIT_BLINK = closeEyes(SIT);
export const BALL_BLINK = closeEyes(BALL);

/** 趴著睡覺（下巴靠在前腳上） */
export const LIE = closeEyes(
  mirror([
    ...SIT_HALF.slice(0, 13),
    '......kwwwwwwm',
    '.......kwwwwmw',
    '...kkkkkkwwwww',
    '.kkkkkkkkkwwww',
    'kkkkkKkkkkkwww',
    'kkkkkkkkkkwwww',
    'kkkkkkkwwwwwk.',
    '.kkkkkwwtwtwk.',
  ]),
);
setAt(LIE, 11, 12, 'N');

/** 坐姿的尾巴，兩格輪流就是搖尾巴 */
export const TAIL_A = ['......kk', '....kkkk', '.kkkkkkw', 'kkkkkwww', '.kkkwww.'];
export const TAIL_B = ['......kw', '.....kkw', '....kkkw', '..kkkkw.', 'kkkkkw..'];

// 側面走路（朝右），大頭短身，耳朵垂在後腦
const WALK_TOP = [
  '..............kkkkkk......',
  '............kkkkkkkkkk....',
  '...........kkkkkkkkkwkk...',
  '..........kKKkkkkkkkwwkk..',
  '.........kKrrKkkkkkkwwwk..',
  '.........krrrrkkkgEkwwwk..',
  '.........kkrrrkkkEEkwwwww.',
  '..........kkrkkkkkkwwwwwnn',
  '...........kkkkkkkwwwwwwnn',
  '............kkkkkwwwwmwwm.',
  '..kk........kkkkVwwwwmpp..',
  '.kKkk.....kkkkkkVVwwwwp...',
  '..kkKk..kkkkkkkkkVVwww....',
  '...kkkkkkkkkkkkkkkwwwww...',
  '...kkkKKkkkkkkkkkkwwwww...',
  '...kkkkkkkkkkkkkkkwwwwV...',
  '....kkkkkkkkkkkkkkwwwV....',
  '....kkkkwwwwwwwkkkwwV.....',
];
export const WALK_A = [...WALK_TOP, '...kkk..kkk..kkw....ww....', '...kww..kww..kww....ww....', '..www...www..www....www...'];
export const WALK_B = [...WALK_TOP, '....kkk.kkk....kkw.ww.....', '....kww.kww....kww.ww.....', '...www.www....www.www.....'];

/** 各姿勢的大小（寬、高） */
export const SIT_W = 28;
export const SIT_H = 28;
export const WALK_W = 26;
export const WALK_H = 21;
export const LIE_W = 28;
export const LIE_H = 21;
/** 走路時嘴巴的位置（叼網球用），相對於朝右的精靈圖左上角 */
export const MOUTH_X = 21;
export const MOUTH_Y = 8;

export const DOG_PAL: Palette = {
  k: '#2a2d3e',
  K: '#474c63',
  L: '#8a8fa8',
  w: '#f6f1e6',
  V: '#cdbfcf',
  r: '#e8828a',
  E: '#0c0b10',
  g: '#ffffff',
  n: '#141218',
  N: '#6a6474',
  m: '#141218',
  p: '#e8707e',
  t: '#b8a8a0',
  Y: '#c8e04a',
  y: '#f4ffb0',
};
export const DOG_OUTLINE = '#141218';

export const TENNIS = ['.YY.', 'YyYW', 'YWYY', '.YY.'];
export const TENNIS_PAL: Palette = { Y: '#c8e04a', y: '#f4ffb0', W: '#f6f1e6' };
export const ZZ = ['ZZZ', '..Z', '.Z.', 'Z..', 'ZZZ'];
