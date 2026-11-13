import { describe, expect, it } from 'vitest';
import { blockedBoxes, NO_INSET, panelInset, viewFrame } from './inset';

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('panelInset', () => {
  it('reads a right-side panel as a right inset', () => {
    expect(panelInset(rect(840, 16, 1264, 704), 1280, 720)).toEqual({ right: 440, bottom: 0 });
  });
  it('reads a bottom sheet as a bottom inset', () => {
    expect(panelInset(rect(0, 500, 390, 844), 390, 844)).toEqual({ right: 0, bottom: 344 });
  });
  it('ignores a missing panel', () => {
    expect(panelInset(null, 1280, 720)).toEqual(NO_INSET);
  });
});

describe('viewFrame', () => {
  it('matches the plain camera when nothing covers the view', () => {
    expect(viewFrame(50, 1280, 720, NO_INSET)).toEqual({ fov: 50, aspect: 1280 / 720, offsetX: 0, offsetY: 0 });
  });

  it('shifts the view center into the free area left of a side panel', () => {
    const f = viewFrame(50, 1200, 600, { right: 400, bottom: 0 });
    expect(f.offsetX).toBe(200);
    expect(f.offsetY).toBe(0);
    expect(f.aspect).toBeCloseTo(800 / 600);
    expect(f.fov).toBeCloseTo(50);
  });

  it('narrows the vertical view above a bottom sheet', () => {
    const f = viewFrame(50, 400, 800, { right: 0, bottom: 400 });
    expect(f.offsetY).toBe(200);
    expect(f.aspect).toBeCloseTo(1);
    // Half the height is free: tan(fov/2) halves.
    expect(Math.tan((f.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((50 * Math.PI) / 360) / 2);
  });
});

describe('blockedBoxes', () => {
  it('turns insets into screen boxes', () => {
    expect(blockedBoxes({ right: 400, bottom: 0 }, 1200, 600)).toEqual([{ x: 800, y: 0, w: 400, h: 600 }]);
    expect(blockedBoxes({ right: 0, bottom: 300 }, 400, 800)).toEqual([{ x: 0, y: 500, w: 400, h: 300 }]);
    expect(blockedBoxes(NO_INSET, 400, 800)).toEqual([]);
  });
});
