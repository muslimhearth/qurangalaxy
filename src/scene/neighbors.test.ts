import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency, topByCount, topNeighbors, TOP_LINKS } from './neighbors';

describe('buildAdjacency', () => {
  it('lists neighbors in both directions, strongest first', () => {
    const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
    expect(adj[1]!.map((n) => n.id)).toEqual([0, 2, 4]);
    expect(adj[4]!.map((n) => n.id).sort()).toEqual([1, 3, 5]);
    expect(adj[0]!.map((n) => n.edge)).toEqual([1, 0]);
  });

  it('ranks by score, not by shared verses', () => {
    // Root 0: link to 1 shares 3 verses (score 1.2), link to 2 shares 2 (score 4.5).
    const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
    expect(adj[0]!.map((n) => [n.id, n.weight, n.score])).toEqual([
      [2, 2, 4.5],
      [1, 3, 1.2],
    ]);
  });
});

describe('topByCount', () => {
  it('returns ids of the most frequent roots', () => {
    expect(topByCount(fixtureGalaxy.roots, 2)).toEqual([1, 4]);
  });
});

describe('topNeighbors', () => {
  it('returns at most TOP_LINKS strongest neighbors', () => {
    const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
    expect(topNeighbors(adj, 1).map((n) => n.id)).toEqual([0, 2, 4]);
    const hub = Array.from({ length: 30 }, (_, i) => ({ source: 0, target: i + 1, weight: 30 - i, score: 30 - i }));
    const hubAdj = buildAdjacency(31, hub);
    expect(topNeighbors(hubAdj, 0)).toHaveLength(TOP_LINKS);
    expect(topNeighbors(hubAdj, 0)[0]!.id).toBe(1);
    expect(topNeighbors(hubAdj, 99)).toEqual([]);
  });
});

describe('buildAdjacency tie-break', () => {
  it('orders equal scores by word count, like the panel list', () => {
    const edges = [
      { source: 0, target: 1, weight: 2, score: 2 },
      { source: 0, target: 2, weight: 2, score: 2 },
    ];
    expect(buildAdjacency(3, edges, [1, 5, 9])[0]!.map((n) => n.id)).toEqual([2, 1]);
    expect(buildAdjacency(3, edges)[0]!.map((n) => n.id)).toEqual([1, 2]);
  });
});
