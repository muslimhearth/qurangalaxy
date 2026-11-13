import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildSceneModel } from './model';

describe('buildSceneModel', () => {
  const m = buildSceneModel(fixtureGalaxy);

  it('sizes buffers to the data', () => {
    const n = fixtureGalaxy.roots.length;
    expect(m.matrices).toHaveLength(n * 16);
    expect(m.baseColors).toHaveLength(n * 3);
    expect(m.radii).toHaveLength(n);
    expect(m.edgePositions).toHaveLength(fixtureGalaxy.edges.length * 6);
    expect(m.adjacency).toHaveLength(n);
  });

  it('derives the bounds from root positions', () => {
    expect(m.bounds.radius).toBeGreaterThan(10);
    expect(m.bounds.radius).toBeLessThan(30);
  });

  it('gives the most frequent root the largest star', () => {
    const maxId = m.radii.indexOf(Math.max(...m.radii));
    expect(maxId).toBe(1);
    expect(m.top[0]).toBe(1);
  });
});
