import { describe, expect, it } from 'vitest';
import { boundingSphere } from './bounds';

describe('boundingSphere', () => {
  it('centers on the mean and reaches the farthest point', () => {
    const s = boundingSphere([
      [0, 0, 0],
      [10, 0, 0],
    ]);
    expect(s.center).toEqual([5, 0, 0]);
    expect(s.radius).toBeCloseTo(5);
  });

  it('returns a unit sphere at the origin for no points', () => {
    expect(boundingSphere([])).toEqual({ center: [0, 0, 0], radius: 1 });
  });

  it('never returns a zero radius', () => {
    expect(boundingSphere([[3, 3, 3]]).radius).toBeGreaterThan(0);
  });
});
