// 產生 PWA 圖示：草地上一格田，長著結了三色果實的果叢（der 藍、die 紅、das 黃綠）
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const N = 32;
const OUT = '#2b1a10';
const LEAF = '#1b3317';

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

function makeArt() {
  const g = Array.from({ length: N }, () => Array(N).fill('#6aa83c'));
  const put = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
  };
  // 草地紋理（固定亂數）
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(rnd() * N), y = Math.floor(rnd() * N), t = rnd();
    if (t < 0.5) { put(x, y, '#5c9634'); put(x + 1, y - 1, '#5c9634'); }
    else { put(x, y, '#82c04c'); put(x, y - 1, '#9ad35a'); }
  }
  // 土
  const sx = 6, sy = 10, sw = 20, sh = 18;
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    const edge = x === sx || y === sy || x === sx + sw - 1 || y === sy + sh - 1;
    const corner = (x === sx || x === sx + sw - 1) && (y === sy || y === sy + sh - 1);
    if (corner) continue;
    put(x, y, edge ? OUT : (y - sy) % 4 === 0 ? '#4e2f1a' : (y - sy) % 4 === 3 ? '#5a371f' : '#6c4226');
  }
  for (let x = sx + 1; x < sx + sw - 1; x++) put(x, sy + 1, '#875632');
  // 果叢
  const bush = [
    '.....HHHHHH.....',
    '...HHMMMMMMHH...',
    '..HMMAaMMMMMMH..',
    '.HMMMAAMMMBbMMH.',
    '.MMMMMMMMMBBMMM.',
    'HMMCcMMMMMMMMMMH',
    'MMMCCMMMMAaMMMMM',
    'MMMMMMMBbAAMMMMM',
    '.MMMMMMBBMMMCcM.',
    '..LMMMMMMMMMCCL.',
    '...LLLLsLLsLLL..',
    '.......s..s.....',
  ];
  const pal = { H: '#7cc552', M: '#4f9a3a', L: '#2f6b2a', s: '#2f6b2a',
    A: '#3050c0', a: '#86a6ff', B: '#c8352e', b: '#ff8a6a', C: '#b8d040', c: '#fbffd0' };
  const bx = 8, by = 9;
  const on = (i, j) => j >= 0 && j < bush.length && i >= 0 && i < bush[j].length && bush[j][i] !== '.';
  for (let j = -1; j <= bush.length; j++) for (let i = -1; i <= 16; i++) {
    if (on(i, j)) continue;
    if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) put(bx + i, by + j, LEAF);
  }
  bush.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') put(bx + i, by + j, pal[ch]); }));
  return g;
}

function png(size, art, scale, bg) {
  const off = Math.floor((size - N * scale) / 2);
  const [br, bgc, bb] = hex(bg);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ax = Math.floor((x - off) / scale), ay = Math.floor((y - off) / scale);
      const inside = x >= off && y >= off && ax < N && ay < N;
      const [r, g, b] = inside ? hex(art[ay][ax]) : [br, bgc, bb];
      const p = y * (size * 4 + 1) + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const art = makeArt();
mkdirSync('public/icons', { recursive: true });
const BG = '#6aa83c';
writeFileSync('public/icons/icon-192.png', png(192, art, 6, BG));
writeFileSync('public/icons/icon-512.png', png(512, art, 16, BG));
writeFileSync('public/icons/icon-maskable-512.png', png(512, art, 12, BG));
writeFileSync('public/icons/apple-touch-icon.png', png(180, art, 5, BG));
console.log('icons written');
