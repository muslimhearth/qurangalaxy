import { describe, expect, it } from 'vitest';
import { starRadii, starRadiusRange } from './scales';

describe('starRadiusRange', () => {
  it('grows with the typical spacing between stars', () => {
    const small = starRadiusRange(20, 6);
    const big = starRadiusRange(200, 1700);
    expect(small.min).toBeLessThan(small.max);
    expect(big.max).toBeGreaterThan(small.max);
  });
});

describe('starRadii', () => {
  it('maps the smallest count to min and the largest to max', () => {
    const r = starRadii([1, 100, 10000], { min: 1, max: 5 });
    expect(r[0]).toBeCloseTo(1);
    expect(r[2]).toBeCloseTo(5);
  });

  it('uses a sqrt scale: 100 is 9/99 of the way from 1 to 10000', () => {
    const r = starRadii([1, 100, 10000], { min: 0, max: 1 });
    expect(r[1]).toBeCloseTo(9 / 99, 5);
  });

  it('returns the middle size when all counts are equal', () => {
    const r = starRadii([5, 5], { min: 2, max: 4 });
    expect(Array.from(r)).toEqual([3, 3]);
  });
});
