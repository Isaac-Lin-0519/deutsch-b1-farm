/**
 * 畫布要放進 wrap 裡多大：DPR 2 以下取整數個螢幕像素，像素才會一樣大；
 * DPR 3 以上螢幕夠細，直接填滿
 */
export function fitStage(wrap: HTMLElement, w = 240, h = 420): { w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  const r = wrap.getBoundingClientRect();
  const scale = Math.min(r.width / w, r.height / h);
  const k = Math.floor(scale * dpr);
  const s = dpr >= 3 || k < 2 ? Math.max(scale, 0.5) : k / dpr;
  return { w: w * s, h: h * s };
}
