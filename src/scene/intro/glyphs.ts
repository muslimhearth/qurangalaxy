import { PHRASE_FONT } from './phrase';

/** Font size of the offscreen drawing in pixels: enough detail for thousands of samples. */
const FONT_PX = 220;

/**
 * Waits for the Arabic font, at most `timeoutMs`. Resolves false when it did not load
 * (then the intro is skipped rather than drawn in a fallback font).
 */
export async function waitForPhraseFont(text: string, timeoutMs: number): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return false;
  const font = `${FONT_PX}px '${PHRASE_FONT}'`;
  const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const load = document.fonts
    .load(font, text)
    .then(() => document.fonts.check(font, text))
    .catch(() => false);
  return Promise.race([load, timeout]);
}

/**
 * Draws the lines right to left on an offscreen canvas, one under the other, and returns the
 * pixels cropped to the ink. The browser does the Arabic shaping. Null without a 2D canvas.
 */
export function drawPhrase(lines: readonly string[]): ImageData | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const font = `${FONT_PX}px '${PHRASE_FONT}'`;
  ctx.font = font;
  const lineH = FONT_PX * 1.25;
  const width = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + FONT_PX);
  const height = Math.ceil(lineH * lines.length + FONT_PX);
  canvas.width = width;
  canvas.height = height;
  // Resizing resets the context state.
  ctx.font = font;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  lines.forEach((l, i) => ctx.fillText(l, width / 2, FONT_PX / 2 + lineH * (i + 0.5)));
  return cropToInk(ctx.getImageData(0, 0, width, height));
}

/** Cuts the image down to the box around its opaque pixels, plus a small margin. */
function cropToInk(img: ImageData): ImageData {
  const { width: w, height: h, data } = img;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! < 128) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return img;
  const m = 4;
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m);
  y1 = Math.min(h - 1, y1 + m);
  const out = new ImageData(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) {
    out.data.set(data.subarray((y * w + x0) * 4, (y * w + x1 + 1) * 4), (y - y0) * out.width * 4);
  }
  return out;
}
