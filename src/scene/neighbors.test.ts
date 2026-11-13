import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency, topByCount } from './neighbors';

describe('buildAdjacency', () => {
  it('lists neighbors in both directions, strongest first', () => {
    const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
    expect(adj[1]!.map((n) => n.id)).toEqual([0, 2, 4]);
    expect(adj[4]!.map((n) => n.id).sort()).toEqual([1, 3, 5]);
    expect(adj[0]!.map((n) => n.edge)).toEqual([0, 1]);
  });
});

describe('topByCount', () => {
  it('returns ids of the most frequent roots', () => {
    expect(topByCount(fixtureGalaxy.roots, 2)).toEqual([1, 4]);
  });
});
