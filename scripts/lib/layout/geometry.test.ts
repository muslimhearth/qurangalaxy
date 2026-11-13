import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../../src/data/types';
import { fibonacciSphere, normalizeToSphere } from './geometry';

const length = ([x, y, z]: Vec3) => Math.hypot(x, y, z);

describe('fibonacciSphere', () => {
  it('returns k points on a sphere of the given radius', () => {
    const points = fibonacciSphere(12, 50);
    expect(points).toHaveLength(12);
    for (const p of points) expect(length(p)).toBeCloseTo(50, 6);
  });

  it('puts a single point at the origin', () => {
    expect(fibonacciSphere(1, 50)).toEqual([[0, 0, 0]]);
  });

  it('returns no points for k = 0', () => {
    expect(fibonacciSphere(0, 50)).toEqual([]);
  });
});

describe('normalizeToSphere', () => {
  it('centers the points and scales the farthest one to the radius', () => {
    const out = normalizeToSphere(
      [
        [10, 10, 10],
        [30, 10, 10],
      ],
      200,
    );
    expect(out[0]).toEqual([-200, 0, 0]);
    expect(out[1]).toEqual([200, 0, 0]);
  });

  it('handles empty input and a single point', () => {
    expect(normalizeToSphere([], 200)).toEqual([]);
    expect(normalizeToSphere([[5, 6, 7]], 200)).toEqual([[0, 0, 0]]);
  });
});
