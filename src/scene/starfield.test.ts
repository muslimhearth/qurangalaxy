import { describe, expect, it } from 'vitest';
import { starfield } from './starfield';

describe('starfield', () => {
  it('places points in a shell between the given radii', () => {
    const { positions, colors } = starfield(500, 100, 200, 1);
    expect(positions).toHaveLength(1500);
    expect(colors).toHaveLength(1500);
    for (let i = 0; i < 500; i++) {
      const r = Math.hypot(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
      expect(r).toBeGreaterThanOrEqual(100 - 1e-3);
      expect(r).toBeLessThanOrEqual(200 + 1e-3);
    }
  });
  it('is deterministic for a seed', () => {
    expect(starfield(10, 1, 2, 7).positions).toEqual(starfield(10, 1, 2, 7).positions);
  });
});
