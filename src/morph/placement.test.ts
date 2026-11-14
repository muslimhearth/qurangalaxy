import { describe, expect, it } from 'vitest';
import { popoverPlace, sheetScroll } from './placement';

const box = (top: number, height: number, left = 0) => ({ left, top, bottom: top + height, height });

describe('popoverPlace', () => {
  const panel = box(80, 600, 860);

  it('goes left of the panel with the arrow at the word line', () => {
    const p = popoverPlace(box(370, 40, 1000), panel, 480, 900);
    expect(p.left).toBe(860 - 360 - 14);
    expect(p.top).toBe(390 - 60);
    expect(p.arrowY).toBe(54);
  });

  it('stays inside the window and moves the arrow instead', () => {
    const p = popoverPlace(box(700, 40, 1000), panel, 480, 760);
    expect(p.top).toBe(760 - 480 - 12);
    expect(p.arrowY).toBe(720 - p.top - 6);
  });

  it('keeps the arrow off the rounded corners', () => {
    expect(popoverPlace(box(0, 10, 1000), panel, 480, 760).arrowY).toBe(14);
  });
});

describe('sheetScroll', () => {
  it('scrolls a word under the sheet up to just above it', () => {
    expect(sheetScroll(box(500, 40), 100, 400)).toBe(540 - 392);
  });

  it('scrolls a word above the panel body down into view', () => {
    expect(sheetScroll(box(60, 40), 100, 400)).toBe(60 - 108);
  });

  it('leaves a visible word alone', () => {
    expect(sheetScroll(box(200, 40), 100, 400)).toBe(0);
  });
});
