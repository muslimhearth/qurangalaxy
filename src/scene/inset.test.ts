import { describe, expect, it } from 'vitest';
import { barInset, blockedBoxes, NO_INSET, panelInset, viewFrame } from './inset';

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('panelInset', () => {
  it('reads a right-side panel as a right inset', () => {
    expect(panelInset(rect(840, 16, 1264, 704), 1280, 720)).toEqual({ right: 440, bottom: 0, top: 0 });
  });
  it('reads a bottom sheet as a bottom inset', () => {
    expect(panelInset(rect(0, 500, 390, 844), 390, 844)).toEqual({ right: 0, bottom: 344, top: 0 });
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
    const f = viewFrame(50, 1200, 600, { right: 400, bottom: 0, top: 0 });
    expect(f.offsetX).toBe(200);
    expect(f.offsetY).toBe(0);
    expect(f.aspect).toBeCloseTo(800 / 600);
    expect(f.fov).toBeCloseTo(50);
  });

  it('narrows the vertical view above a bottom sheet', () => {
    const f = viewFrame(50, 400, 800, { right: 0, bottom: 400, top: 0 });
    expect(f.offsetY).toBe(200);
    expect(f.aspect).toBeCloseTo(1);
    // Half the height is free: tan(fov/2) halves.
    expect(Math.tan((f.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((50 * Math.PI) / 360) / 2);
  });
});

describe('viewFrame with a top bar', () => {
  it('centers the view between the search bar and the sheet', () => {
    const f = viewFrame(50, 400, 800, { right: 0, bottom: 300, top: 100 });
    expect(f.offsetY).toBe(100); // (300 - 100) / 2
    expect(f.aspect).toBeCloseTo(1);
    expect(Math.tan((f.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((50 * Math.PI) / 360) / 2);
  });
});

describe('barInset', () => {
  it('reads the bottom edge of the top bar', () => {
    expect(barInset(rect(20, 10, 400, 54.4), NO_INSET, 800)).toBe(54);
    expect(barInset(null, NO_INSET, 800)).toBe(0);
  });

  it('ignores the bar when the panel leaves too little room below it (maximized sheet)', () => {
    expect(barInset(rect(20, 10, 400, 54), { right: 0, bottom: 300, top: 0 }, 839)).toBe(54);
    expect(barInset(rect(20, 10, 400, 54), { right: 0, bottom: 759, top: 0 }, 839)).toBe(0);
  });
});

describe('blockedBoxes', () => {
  it('blocks the top bar too', () => {
    expect(blockedBoxes({ right: 0, bottom: 0, top: 60 }, 400, 800)).toEqual([{ x: 0, y: 0, w: 400, h: 60 }]);
  });

  it('turns insets into screen boxes', () => {
    expect(blockedBoxes({ right: 400, bottom: 0, top: 0 }, 1200, 600)).toEqual([{ x: 800, y: 0, w: 400, h: 600 }]);
    expect(blockedBoxes({ right: 0, bottom: 300, top: 0 }, 400, 800)).toEqual([{ x: 0, y: 500, w: 400, h: 300 }]);
    expect(blockedBoxes(NO_INSET, 400, 800)).toEqual([]);
  });
});
