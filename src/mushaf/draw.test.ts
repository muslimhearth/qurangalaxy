import { describe, expect, it } from 'vitest';
import { COLORS, drawMosaic } from './draw';
import { mushafLayout } from './layout';
import { litStates } from './lit';
import { VERSE_COUNTS } from './surahs';

/** Fake 2D context: counts the dots in each path and records each fill's color. */
function fakeContext() {
  const fills: { color: string; dots: number; composite: string }[] = [];
  const texts: string[] = [];
  let dots = 0;
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    globalCompositeOperation: 'source-over',
    beginPath: () => (dots = 0),
    rect: () => dots++,
    roundRect: () => dots++,
    fill: () => fills.push({ color: ctx.fillStyle, dots, composite: ctx.globalCompositeOperation }),
    fillText: (t: string) => texts.push(t),
    clearRect: () => {},
    stroke: () => {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, texts };
}

const layout = mushafLayout(VERSE_COUNTS, 800, 600);
const occ = (...keys: string[]) => keys.map((v) => ({ v: v as `${number}:${number}`, w: [1] }));

describe('drawMosaic', () => {
  it('draws every verse as a dim dot and labels the rows', () => {
    const { ctx, fills, texts } = fakeContext();
    drawMosaic(ctx, layout, 800, 600, { lit: litStates(undefined, undefined), alpha: 1, surah: null, active: -1 });
    expect(fills).toEqual([{ color: COLORS.dim, dots: 6236, composite: 'source-over' }]);
    expect(texts[0]).toBe('1');
  });

  it('draws lit dots in amber, blue and white over the dim ones', () => {
    const { ctx, fills } = fakeContext();
    const lit = litStates(occ('1:1', '1:2', '2:255'), occ('2:255', '3:1'));
    drawMosaic(ctx, layout, 800, 600, { lit, alpha: 1, surah: null, active: -1 });
    expect(fills.slice(1)).toEqual([
      { color: COLORS.a, dots: 2, composite: 'source-over' },
      { color: COLORS.b, dots: 1, composite: 'source-over' },
      { color: COLORS.both, dots: 1, composite: 'source-over' },
    ]);
  });

  it('brightens and outlines the surah under the pointer', () => {
    const { ctx, fills } = fakeContext();
    drawMosaic(ctx, layout, 800, 600, { lit: litStates(undefined, undefined), alpha: 1, surah: 2, active: 7 });
    // The outline's inside is erased, then 286 brighter dots for Al-Baqarah.
    expect(fills[0]!.composite).toBe('destination-out');
    expect(fills).toContainEqual({ color: COLORS.dimSurah, dots: 286, composite: 'source-over' });
    expect(fills).toContainEqual({ color: COLORS.dim, dots: 6236 - 286, composite: 'source-over' });
  });
});
