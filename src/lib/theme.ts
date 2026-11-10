import { grass, S } from './pixel';

export async function loadFont() {
  const url = new URL('fonts/Cubic_11.woff2', document.baseURI).href;
  try {
    const face = await new FontFace('Cubic11', `url(${url})`).load();
    document.fonts.add(face);
  } catch {
    // 字體載入失敗就用系統字體，不影響使用
  }
}

/**
 * 俐方體 11 號的字是 12px 一格，字級設成「每個字體像素剛好整數個螢幕像素」才不會糊。
 * DPR 3 → 16px、DPR 2 → 18px；DPR 1 的桌機就用 16px。
 */
export function applyTheme() {
  const root = document.documentElement.style;
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.round((16 * dpr) / 12));
  const fs = dpr >= 2 ? (k * 12) / dpr : 16;
  root.setProperty('--fs', `${fs}px`);
  root.setProperty('--fs2', `${fs * 2}px`);

  // 草地背景磚：1 個美術像素 = 3 CSS px，跟農場畫面一樣
  const tile = document.createElement('canvas');
  tile.width = 32 * S;
  tile.height = 32 * S;
  const c = tile.getContext('2d')!;
  grass(c, 32, 32, 3);
  root.setProperty('--grass-tile', `url(${tile.toDataURL()})`);
}
