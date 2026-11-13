import { describe, expect, it } from 'vitest';
import { randomDirection, seededRandom } from './random';

describe('seededRandom', () => {
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(3);
    const b = seededRandom(3);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randomDirection', () => {
  it('returns unit vectors', () => {
    const rand = seededRandom(1);
    for (let i = 0; i < 20; i++) expect(Math.hypot(...randomDirection(rand))).toBeCloseTo(1);
  });
});
