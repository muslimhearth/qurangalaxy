import { describe, expect, it } from 'vitest';
import { seededRandom } from '../random';
import { assignTargets } from './assign';

const randomPoints = (n: number, seed: number) => {
  const r = seededRandom(seed);
  return Float32Array.from({ length: n * 2 }, () => r() * 100);
};

describe('assignTargets', () => {
  it('returns a permutation', () => {
    const perm = assignTargets(randomPoints(500, 1), randomPoints(500, 2));
    expect(perm.length).toBe(500);
    expect(new Set(perm).size).toBe(500);
    expect(Math.min(...perm)).toBe(0);
    expect(Math.max(...perm)).toBe(499);
  });

  it('is deterministic', () => {
    const a = randomPoints(300, 3);
    const b = randomPoints(300, 4);
    expect(assignTargets(a, b)).toEqual(assignTargets(a, b));
  });

  it('keeps the layout: a point set mapped onto itself moves little', () => {
    const a = randomPoints(400, 5);
    const perm = assignTargets(a, a.slice());
    let moved = 0;
    for (let i = 0; i < 400; i++) {
      moved += Math.hypot(a[i * 2]! - a[perm[i]! * 2]!, a[i * 2 + 1]! - a[perm[i]! * 2 + 1]!);
    }
    expect(moved / 400).toBeLessThan(10); // a random permutation moves about 52 on average
  });

  it('keeps left-to-right order within a band', () => {
    const src = Float32Array.from([0, 0, 10, 0, 20, 0, 30, 0]);
    const dst = Float32Array.from([35, 5, 5, 5, 25, 5, 15, 5]);
    expect([...assignTargets(src, dst, 1)]).toEqual([1, 3, 2, 0]);
  });
});
