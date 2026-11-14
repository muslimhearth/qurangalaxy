import { describe, expect, it } from 'vitest';
import { edgeFades, revealScroll } from './strip';

describe('tab strip scrolling', () => {
  it('finds no overflow when all pills fit', () => {
    expect(edgeFades(0, 300, 300)).toEqual({ overflow: false, start: false, end: false });
  });

  it('fades the edges that have hidden pills', () => {
    expect(edgeFades(0, 600, 300)).toEqual({ overflow: true, start: false, end: true });
    expect(edgeFades(150, 600, 300)).toEqual({ overflow: true, start: true, end: true });
    expect(edgeFades(300, 600, 300)).toEqual({ overflow: true, start: true, end: false });
  });

  it('ignores sub-pixel rounding', () => {
    expect(edgeFades(0, 300.6, 300)).toEqual({ overflow: false, start: false, end: false });
  });

  it('keeps the scroll when the pill is fully in view, clear of the fades', () => {
    expect(revealScroll({ start: 100, end: 160 }, { scroll: 50, width: 300, max: 300 }, 20)).toBe(50);
  });

  it('scrolls left so a pill cut at the start shows with the fade margin', () => {
    expect(revealScroll({ start: 100, end: 160 }, { scroll: 90, width: 300, max: 300 }, 20)).toBe(80);
  });

  it('scrolls right so a pill cut at the end shows with the fade margin', () => {
    expect(revealScroll({ start: 400, end: 460 }, { scroll: 0, width: 300, max: 300 }, 20)).toBe(180);
  });

  it('stays inside the scroll range', () => {
    expect(revealScroll({ start: 5, end: 60 }, { scroll: 100, width: 300, max: 300 }, 20)).toBe(0);
    expect(revealScroll({ start: 560, end: 600 }, { scroll: 0, width: 300, max: 300 }, 20)).toBe(300);
  });

  it('shows the start of a pill wider than the view', () => {
    expect(revealScroll({ start: 200, end: 600 }, { scroll: 0, width: 300, max: 500 }, 20)).toBe(180);
  });
});
