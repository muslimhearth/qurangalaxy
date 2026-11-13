import { describe, expect, it } from 'vitest';
import { sampleGlyphPoints, type ImageLike } from './sample';

/** RGBA image with an opaque filled rectangle [x0, x1) × [y0, y1) on a transparent background. */
function rectImage(w: number, h: number, x0: number, y0: number, x1: number, y1: number): ImageLike {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[(y * w + x) * 4 + 3] = 255;
  return { width: w, height: h, data };
}

const inside = (p: Float32Array, i: number, x0: number, y0: number, x1: number, y1: number) =>
  p[i * 2]! >= x0 && p[i * 2]! < x1 && p[i * 2 + 1]! >= y0 && p[i * 2 + 1]! < y1;

describe('sampleGlyphPoints', () => {
  it('returns exactly N points, all inside the shape', () => {
    const img = rectImage(100, 60, 20, 10, 70, 40);
    const pts = sampleGlyphPoints(img, 300, 1);
    expect(pts.length).toBe(600);
    for (let i = 0; i < 300; i++) expect(inside(pts, i, 20, 10, 70, 40)).toBe(true);
  });

  it('spreads points over the whole shape', () => {
    const img = rectImage(100, 100, 0, 0, 100, 100);
    const pts = sampleGlyphPoints(img, 400, 2);
    // 16 cells of 25×25: uniform would give 25 points each.
    const cells = new Array<number>(16).fill(0);
    for (let i = 0; i < 400; i++) cells[Math.floor(pts[i * 2]! / 25) + 4 * Math.floor(pts[i * 2 + 1]! / 25)]!++;
    for (const c of cells) {
      expect(c).toBeGreaterThan(12);
      expect(c).toBeLessThan(40);
    }
  });

  it('keeps points apart (Poisson-like, no clumps)', () => {
    const img = rectImage(100, 100, 0, 0, 100, 100);
    const pts = sampleGlyphPoints(img, 200, 3);
    let minD = Infinity;
    for (let i = 0; i < 200; i++)
      for (let j = i + 1; j < 200; j++)
        minD = Math.min(minD, Math.hypot(pts[i * 2]! - pts[j * 2]!, pts[i * 2 + 1]! - pts[j * 2 + 1]!));
    // Uniform random points would come much closer; the mean spacing is about 7 px.
    expect(minD).toBeGreaterThan(2);
  });

  it('is deterministic per seed', () => {
    const img = rectImage(50, 50, 5, 5, 45, 45);
    expect(sampleGlyphPoints(img, 100, 7)).toEqual(sampleGlyphPoints(img, 100, 7));
  });

  it('handles more points than pixels and an empty image', () => {
    const img = rectImage(10, 10, 2, 2, 4, 4); // 4 pixels
    const pts = sampleGlyphPoints(img, 50, 1);
    for (let i = 0; i < 50; i++) expect(inside(pts, i, 2, 2, 4, 4)).toBe(true);
    const empty = sampleGlyphPoints(rectImage(10, 10, 0, 0, 0, 0), 5, 1);
    expect(empty.length).toBe(10);
  });
});
