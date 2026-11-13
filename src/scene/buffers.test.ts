import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { edgePositions, starBaseColors, starMatrices } from './buffers';
import { clusterColor } from './palette';

describe('edgePositions', () => {
  it('stores two xyz points per edge', () => {
    const p = edgePositions(fixtureGalaxy.roots, fixtureGalaxy.edges);
    expect(p).toHaveLength(fixtureGalaxy.edges.length * 6);
    expect(Array.from(p.slice(0, 6))).toEqual([0, 0, 0, 12, 4, -3]);
  });
});

describe('starMatrices', () => {
  it('scales by radius and translates to the root position', () => {
    const m = starMatrices(fixtureGalaxy.roots, new Float32Array([1, 2, 1, 1, 1, 1]));
    expect(m).toHaveLength(6 * 16);
    const second = Array.from(m.slice(16, 32));
    expect(second[0]).toBe(2);
    expect(second[5]).toBe(2);
    expect(second[10]).toBe(2);
    expect(second.slice(12, 16)).toEqual([12, 4, -3, 1]);
  });
});

describe('starBaseColors', () => {
  it('uses the cluster palette color for each root', () => {
    const c = starBaseColors(fixtureGalaxy.roots);
    const expected = clusterColor(fixtureGalaxy.roots[2]!.cluster);
    expect(c[6]).toBeCloseTo(expected[0]);
    expect(c[7]).toBeCloseTo(expected[1]);
    expect(c[8]).toBeCloseTo(expected[2]);
  });
});
