// 邊牧之家的房間（120×210 美術像素）：牆、地板、家具，以及跟著時間季節天氣變的窗外
import type { Env } from './env';
import { box, cached, blit, OUT, panel, px, rect, sprite, S, type Ctx, type Palette } from './pixel';

export const WIN = { x: 40, y: 40, w: 36, h: 32 };
export const BED = { x: 85, y: 125, w: 34 };
export const BASKET_AT = { x: 4, y: 186 };
export const BOWL_AT = { x: 36, y: 191 };
export const WATER_BTN = { x: 62, y: 184, w: 54, h: 22 };

export function wall(c: Ctx) {
  rect(c, 0, 0, 120, 121, '#b47a44');
  for (let x = 0; x < 120; x += 10) {
    rect(c, x, 0, 1, 121, '#93602f');
    rect(c, x + 1, 0, 1, 121, '#c48d56');
  }
  for (const [x, y] of [[6, 20], [27, 52], [63, 14], [96, 30], [44, 100], [115, 90], [16, 64]]) {
    px(c, x, y, '#93602f');
    px(c, x, y + 1, '#93602f');
    px(c, x + 1, y + 1, '#a56f3c');
  }
  rect(c, 0, 0, 120, 2, '#7a4a26');
  rect(c, 0, 116, 120, 5, '#6e3c18');
  rect(c, 0, 116, 120, 1, '#a8703f');
  rect(c, 0, 120, 120, 1, OUT);
}

export function floor(c: Ctx) {
  rect(c, 0, 121, 120, 89, '#9a6438');
  let k = 0;
  for (let y = 121; y < 210; y += 7, k++) {
    rect(c, 0, y, 120, 1, '#7a4a26');
    rect(c, 0, y + 1, 120, 1, '#a9713f');
    for (let x = (k % 2) * 12; x < 120; x += 24) rect(c, x, y, 1, 7, '#7a4a26');
  }
  rect(c, 0, 121, 120, 2, '#6e4224');
}

export function calendar(c: Ctx, x: number, y: number) {
  px(c, x + 10, y - 3, OUT);
  px(c, x + 9, y - 2, OUT);
  px(c, x + 11, y - 2, OUT);
  box(c, x, y, 21, 21, '#fff7e0');
  rect(c, x + 1, y + 1, 19, 5, '#c8352e');
  rect(c, x + 1, y + 1, 19, 1, '#e0574a');
  px(c, x + 5, y, '#5a3214');
  px(c, x + 15, y, '#5a3214');
  const done = [0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14];
  for (let i = 0; i < 18; i++) {
    rect(c, x + 2 + (i % 6) * 3, y + 8 + Math.floor(i / 6) * 4, 2, 2, done.includes(i) ? '#5c9634' : '#e2c38a');
  }
  rect(c, x + 11, y + 16, 2, 2, '#c8352e');
}

export function bookshelf(c: Ctx, x: number, y: number, w: number, h: number) {
  box(c, x, y, w, h, '#7a4520');
  rect(c, x + 1, y + 1, w - 2, 1, '#a8703f');
  const books = ['#c8352e', '#3050c0', '#e0a020', '#4f9a3a', '#8a4fb0', '#e07a1f', '#f3dcaa', '#3d7fd9', '#c8352e', '#4f9a3a'];
  let k = 0;
  for (let sy = y + 3; sy < y + h - 8; sy += 14) {
    rect(c, x + 2, sy, w - 4, 11, '#4a2810');
    let bx = x + 3;
    while (bx < x + w - 5) {
      const bw = 2 + (k % 3 === 0 ? 1 : 0);
      const bh = 7 + ((k * 7) % 4);
      rect(c, bx, sy + 11 - bh, bw, bh, books[k % books.length]);
      rect(c, bx, sy + 11 - bh, bw, 1, '#f8e8c0');
      px(c, bx, sy + 13 - bh, OUT);
      bx += bw + (k % 4 === 2 ? 2 : 1);
      k++;
    }
    rect(c, x + 1, sy + 11, w - 2, 2, '#9a5a28');
    rect(c, x + 1, sy + 11, w - 2, 1, '#c48d56');
  }
}

export function door(c: Ctx, x: number, y: number, w: number, h: number) {
  box(c, x - 2, y - 2, w + 4, h + 2, '#5a3214');
  rect(c, x, y, w, h, '#8a5428');
  for (let i = 5; i < w; i += 5) rect(c, x + i, y, 1, h, '#6e3c18');
  rect(c, x + 2, y + 3, w - 4, 1, '#6e3c18');
  rect(c, x + 2, y + h - 12, w - 4, 1, '#6e3c18');
  box(c, x + 4, y + 5, w - 8, 9, '#a8dcf2');
  rect(c, x + Math.floor(w / 2), y + 6, 1, 7, '#5a3214');
  px(c, x + 6, y + 7, '#ffffff');
  rect(c, x + w - 5, y + Math.floor(h / 2), 2, 2, '#f0c040');
  px(c, x + w - 5, y + Math.floor(h / 2), '#fff3b0');
}

export function rug(c: Ctx, x: number, y: number, w: number, h: number) {
  rect(c, x + 2, y, w - 4, h, OUT);
  rect(c, x, y + 2, w, h - 4, OUT);
  rect(c, x + 1, y + 1, w - 2, h - 2, OUT);
  rect(c, x + 2, y + 1, w - 4, h - 2, '#f3dcaa');
  rect(c, x + 1, y + 2, w - 2, h - 4, '#f3dcaa');
  rect(c, x + 4, y + 3, w - 8, h - 6, '#b8453a');
  rect(c, x + 3, y + 4, w - 6, h - 8, '#b8453a');
  rect(c, x + 6, y + 6, w - 12, h - 12, '#d9655a');
  rect(c, x + 8, y + 8, w - 16, h - 16, '#b8453a');
  for (let i = x + 10; i < x + w - 10; i += 6) {
    px(c, i, y + 5, '#f3dcaa');
    px(c, i + 3, y + h - 6, '#f3dcaa');
  }
  for (let i = x - 1; i < x + w; i += 3) {
    px(c, i + 1, y - 1, '#f3dcaa');
    px(c, i + 1, y + h, '#f3dcaa');
  }
}

/** 狗窩分前後兩層：狗躺進去時，前緣要蓋在狗身上 */
function bedRows(W: number): string[] {
  const r = (n: number, ch: string) => ch.repeat(n);
  return [
    '......' + r(W - 12, 'B') + '......',
    '....BB' + r(W - 12, 'b') + 'BB....',
    '..BB' + r(W - 8, 'b') + 'BB..',
    '.Bbbb' + r(W - 10, 'B') + 'bbbB.',
    'BbbbB' + r(W - 10, 'c') + 'BbbbB',
    'BbbB' + r(W - 8, 'c') + 'BbbB',
    'BbbB' + 'cC'.repeat((W - 8) / 2) + 'BbbB',
    'BbbB' + r(W - 8, 'c') + 'BbbB',
    'BbbbB' + r(W - 10, 'c') + 'BbbbB',
    'Bbbbb' + r(W - 10, 'B') + 'bbbbB',
    '.B' + r(W - 4, 'h') + 'B.',
    '..BB' + r(W - 8, 'b') + 'BB..',
    '....' + r(W - 8, 'B') + '....',
  ];
}
const BED_ROWS = bedRows(BED.w);
const BED_PAL: Palette = { B: '#2f5a7a', b: '#4f86a8', h: '#7ab0cc', c: '#f3dcaa', C: '#ead09a' };

export function bed(c: Ctx) {
  sprite(c, BED_ROWS, BED.x, BED.y, BED_PAL, OUT);
}

export function bedFront(c: Ctx) {
  blit(c, cached('bedFront', BED_ROWS.slice(9), BED_PAL, OUT), BED.x, BED.y + 9);
}

export function gear(c: Ctx, x: number, y: number) {
  sprite(c, ['...GG...', '.G.GG.G.', '.GGGGGG.', 'GGGddGGG', 'GGGddGGG', '.GGGGGG.', '.G.GG.G.', '...GG...'], x, y, { G: '#e2c38a', d: '#6e3c18' }, OUT);
}

export function plant(c: Ctx, x: number, y: number) {
  sprite(
    c,
    ['..L..L..', '.LMLLML.', 'LMMLMMML', '.LMMMML.', '..LMML..', '...MM...', '.PPPPPP.', '.PpPPPP.', '..PPPP..', '..PPPP..'],
    x,
    y,
    { L: '#7cc552', M: '#4f9a3a', P: '#c06a3a', p: '#e08a50' },
    OUT,
  );
}

const HEART = ['.H.H.', 'HHHHH', 'HHHHH', '.HHH.', '..H..'];
export function heart(c: Ctx, x: number, y: number, full: boolean) {
  blit(c, cached(full ? 'heart1' : 'heart0', HEART, { H: full ? '#e0484a' : '#8a6a50' }, OUT), x, y);
  if (full) px(c, x + 1, y + 1, '#ff9a9a');
}

const BOWL = ['..FfFR..', '.RRRRRR.', 'RrrrrrrR', 'RRRRRRRR', '.RRRRRR.'];
const BOWL_EMPTY = ['........', '.RRRRRR.', 'RrrrrrrR', 'RRRRRRRR', '.RRRRRR.'];
const BOWL_PAL: Palette = { R: '#3d7fd9', r: '#86a6ff', F: '#c8352e', f: '#ff8a6a' };
export function bowl(c: Ctx, full: boolean) {
  blit(c, cached(full ? 'bowl1' : 'bowl0', full ? BOWL : BOWL_EMPTY, BOWL_PAL, OUT), BOWL_AT.x, BOWL_AT.y);
}

/** 房間裡不會動的部分（可以先畫好存起來） */
export function room(c: Ctx) {
  wall(c);
  floor(c);
  calendar(c, 93, 38);
  door(c, 6, 74, 20, 42);
  bookshelf(c, 88, 68, 28, 49);
  plant(c, 28, 106);
  for (let i = 0; i < 24; i++) rect(c, 4 + i, 121, 1, 4, i % 4 < 2 ? '#c48d56' : '#9a5a28');
  rug(c, 24, 144, 72, 34);
  bed(c);
  gear(c, 109, 9);
  panel(c, WATER_BTN.x, WATER_BTN.y, WATER_BTN.w, WATER_BTN.h);
}

// ---- 窗外 ----
const SKY = { morning: ['#bfe4f4', '#e2f4fb'], noon: ['#a8dcf2', '#c4e8f8'], dusk: ['#f2a46a', '#c27a9a'], night: ['#1c2448', '#121834'] };
const SKY_WET = { morning: ['#b4c4cc', '#c8d2d8'], noon: ['#a4b4c0', '#b4c2cc'], dusk: ['#b08478', '#8a6a80'], night: ['#181c30', '#12152a'] };
const HILL = { spring: '#5c9634', summer: '#3f8228', autumn: '#8a8a3a', winter: '#d6e2e8' };
const FIELD = { spring: ['#7cc552', '#6aa83c'], summer: ['#5fb03c', '#4c982e'], autumn: ['#c8b052', '#b49a40'], winter: ['#eef4f8', '#dce8ee'] };
const HILLS = ['......GGG......GG....', '..GGGGGGGGG..GGGGGGG.', 'GGGGGGGGGGGGGGGGGGGGG'];
const BALL4 = ['.SS.', 'SSSS', 'SSSS', '.SS.'];
const CLOUD = ['..WWW...', '.WWWWWW.', 'WWWWWWWW'];

/**
 * dryPlots：外面田裡要畫幾格乾掉的土（頭上有水滴），跟農場的狀態一致
 */
export function windowView(c: Ctx, env: Env, t: number, dryPlots: number) {
  const { x, y, w, h } = WIN;
  const { tod, season, weather } = env;
  const wet = weather === 'rain' || weather === 'snow';
  rect(c, x - 7, y - 6, w + 14, 2, '#6e3c18');
  box(c, x - 2, y - 2, w + 4, h + 4, '#efdcae');

  c.save();
  c.beginPath();
  c.rect(x * S, y * S, w * S, h * S);
  c.clip();
  const [sky, top] = (wet ? SKY_WET : SKY)[tod];
  rect(c, x, y, w, h, sky);
  rect(c, x, y, w, 4, top);
  if (tod === 'morning' && !wet) rect(c, x, y + 8, w, 2, '#f6e2c4');
  if (tod === 'night' && !wet) {
    [[3, 2], [9, 5], [14, 1], [21, 4], [27, 1], [32, 6], [6, 8], [24, 7]].forEach(([a, b], i) => {
      if ((Math.floor(t / 700) + i) % 4) px(c, x + a, y + b, '#fff8d0');
    });
  }
  if (!wet) {
    const sun = (sx: number, sy: number, col: string, hi: string) => {
      blit(c, cached(`sun${col}`, BALL4, { S: col }), sx, sy);
      px(c, sx + 1, sy + 1, hi);
    };
    if (tod === 'morning') sun(x + 3, y + 5, '#ffe48a', '#fff8d8');
    if (tod === 'noon') sun(x + w - 8, y + 2, '#ffe066', '#fff3b0');
    if (tod === 'dusk') sun(x + w - 10, y + 7, '#ff9a4a', '#ffd08a');
    if (tod === 'night') {
      blit(c, cached('moon', BALL4, { S: '#f4f0c8' }), x + w - 9, y + 2);
      rect(c, x + w - 9, y + 2, 2, 3, SKY.night[0]);
      px(c, x + w - 8, y + 1, SKY.night[1]);
    }
  }
  const nCloud = weather === 'clear' ? 1 : 3;
  const ccol = weather === 'rain' ? '#8e98a6' : wet ? '#c8d0d8' : tod === 'night' ? '#3a4264' : tod === 'dusk' ? '#f8cdb8' : '#ffffff';
  for (let i = 0; i < nCloud; i++) {
    const cx = x + ((t / (260 + i * 90) + i * 19) % (w + 16)) - 12;
    blit(c, cached(`cloud${ccol}`, CLOUD, { W: ccol }), cx, y + 1 + i * 3);
  }
  sprite(c, HILLS, x, y + 9, { G: HILL[season] });
  sprite(c, HILLS, x + 21, y + 9, { G: HILL[season] });
  if (season === 'autumn') {
    [[3, 10], [7, 9], [8, 11], [14, 10], [17, 11], [24, 10], [27, 9], [31, 11], [34, 10]].forEach(([a, b], i) =>
      px(c, x + a, y + b, i % 3 ? '#e0903a' : '#c8543c'),
    );
  }
  const [f1, f2] = FIELD[season];
  rect(c, x, y + 12, w, h - 12, f1);
  rect(c, x, y + 16, w, h - 16, f2);
  if (season === 'spring') {
    [[2, 18], [12, 25], [30, 19], [18, 30], [33, 28]].forEach(([a, b], i) => px(c, x + a, y + b, i % 2 ? '#fff4a0' : '#f8a8c8'));
  }
  [[4, 20], [15, 20], [26, 20], [9, 27], [21, 27]].forEach(([a, b], i) => {
    const px0 = x + a;
    const py0 = y + b;
    const dry = i < dryPlots;
    rect(c, px0, py0, 7, 4, dry ? '#9a7448' : '#6c4226');
    rect(c, px0, py0, 7, 1, season === 'winter' ? '#ffffff' : dry ? '#b48c5c' : '#875632');
    if (season !== 'winter') {
      px(c, px0 + 3, py0 - 1, '#4f9a3a');
      px(c, px0 + 2, py0 - 2, '#7cc552');
      px(c, px0 + 4, py0 - 2, '#7cc552');
    }
    if (dry) {
      rect(c, px0 + 5, py0 - 6, 2, 3, '#3d7fd9');
      px(c, px0 + 5, py0 - 6, '#bfe2ff');
    }
  });
  if (tod === 'night') {
    c.fillStyle = 'rgba(10,14,44,0.55)';
    c.fillRect(x * S, (y + 9) * S, w * S, (h - 9) * S);
  }
  if (tod === 'dusk') {
    c.fillStyle = 'rgba(150,60,40,0.18)';
    c.fillRect(x * S, (y + 9) * S, w * S, (h - 9) * S);
  }
  if (weather === 'rain') {
    for (let i = 0; i < 16; i++) {
      const dy = ((i * 23 + t / 22) % (h + 4)) - 2;
      const dx = (i * 13 + 40 - dy * 0.5) % (w + 6);
      rect(c, x + Math.floor(dx), y + Math.floor(dy), 1, 2, '#cfe2f8');
    }
  }
  if (weather === 'snow') {
    for (let i = 0; i < 18; i++) {
      const dy = ((i * 19 + t / 90) % (h + 2)) - 1;
      const dx = (i * 11 + Math.sin(t / 600 + i) * 2 + w * 2) % w;
      px(c, x + Math.floor(dx), y + Math.floor(dy), '#ffffff');
    }
  }
  c.restore();

  rect(c, x + w / 2 - 1, y, 2, h, '#efdcae');
  rect(c, x, y + h / 2 - 1, w, 2, '#efdcae');
  if (tod !== 'night') {
    px(c, x + 2, y + 2, '#ffffff');
    px(c, x + 3, y + 2, '#ffffff');
    px(c, x + 2, y + 3, '#ffffff');
  }
  if (season === 'winter') {
    [[0, 0], [1, 0], [0, 1], [w - 1, h - 1], [w - 2, h - 1], [w - 1, h - 2], [w / 2 + 1, h / 2 + 1], [w / 2 - 2, h / 2 + 1]].forEach(([a, b]) =>
      px(c, x + a, y + b, '#f4fbff'),
    );
  }
  box(c, x - 4, y + h + 2, w + 8, 4, '#9a5a28');
  rect(c, x - 3, y + h + 3, w + 6, 1, '#d08a46');
  for (const cx of [x - 9, x + w + 2]) {
    rect(c, cx, y - 4, 7, h + 9, '#c8483c');
    for (let i = 1; i < 7; i += 2) rect(c, cx + i, y - 4, 1, h + 9, '#a8382e');
    rect(c, cx, y + h - 6, 7, 2, '#f0c040');
  }
}

/** 整個房間的光線：早上偏暖、傍晚偏橘、晚上偏暗藍；下雨下雪白天也暗一點 */
export function lighting(c: Ctx, env: Env) {
  const tint = { morning: 'rgba(255,226,170,0.07)', noon: '', dusk: 'rgba(255,130,60,0.12)', night: 'rgba(22,26,70,0.30)' }[env.tod];
  if (tint) {
    c.fillStyle = tint;
    c.fillRect(0, 0, 240, 420);
  }
  if ((env.weather === 'rain' || env.weather === 'snow') && env.tod !== 'night') {
    c.fillStyle = 'rgba(60,70,100,0.08)';
    c.fillRect(0, 0, 240, 420);
  }
}
