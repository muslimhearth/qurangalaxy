import { describe, expect, it } from 'vitest';
import { syntheticGalaxy } from './synthetic';

describe('syntheticGalaxy', () => {
  it('builds a valid galaxy of the requested size', () => {
    const g = syntheticGalaxy({ roots: 1700, edges: 8000, clusters: 12, radius: 200, seed: 1 });
    expect(g.roots).toHaveLength(1700);
    expect(g.edges.length).toBeGreaterThan(7000);
    expect(g.clusterCount).toBe(12);
    for (const e of g.edges) expect(e.source).toBeLessThan(e.target);
    const keys = new Set(g.edges.map((e) => `${e.source}-${e.target}`));
    expect(keys.size).toBe(g.edges.length);
    g.roots.forEach((r, i) => expect(r.id).toBe(i));
  });

  it('is deterministic for a seed', () => {
    const a = syntheticGalaxy({ roots: 50, edges: 100, clusters: 3, radius: 10, seed: 4 });
    const b = syntheticGalaxy({ roots: 50, edges: 100, clusters: 3, radius: 10, seed: 4 });
    expect(a).toEqual(b);
  });
});
