import { describe, expect, it } from 'vitest';
import type { Edge } from '../../../src/data/types';
import { detectClusters } from './clusters';
import { syntheticGraph } from './synthetic';

/** All edges of a clique over the given nodes. */
function clique(nodes: number[], weight: number): Edge[] {
  const edges: Edge[] = [];
  for (const a of nodes) for (const b of nodes) if (a < b) edges.push({ source: a, target: b, weight });
  return edges;
}

/** Sizes of clusters 0..clusterCount-1. */
function sizes(clusters: number[], clusterCount: number): number[] {
  const s = new Array<number>(clusterCount).fill(0);
  for (const c of clusters) s[c]!++;
  return s;
}

describe('detectClusters', () => {
  it('finds two cliques joined by one weak edge', () => {
    const edges = [...clique([0, 1, 2, 3, 4, 5], 5), ...clique([6, 7, 8, 9, 10, 11], 5)];
    edges.push({ source: 5, target: 6, weight: 1 });
    const { clusters, clusterCount } = detectClusters(12, edges);
    expect(clusterCount).toBe(2);
    expect(new Set(clusters.slice(0, 6)).size).toBe(1);
    expect(new Set(clusters.slice(6)).size).toBe(1);
    expect(clusters[0]).not.toBe(clusters[6]);
  });

  it('numbers clusters by size, largest first', () => {
    const edges = [...clique([0, 1, 2, 3], 5), ...clique([4, 5, 6, 7, 8, 9, 10], 5)];
    edges.push({ source: 3, target: 4, weight: 1 });
    const { clusters, clusterCount } = detectClusters(11, edges);
    expect(clusterCount).toBe(2);
    expect(clusters[4]).toBe(0);
    expect(clusters[0]).toBe(1);
  });

  it('caps a large graph at 12 clusters with valid, size-ordered ids', () => {
    const { counts, edges } = syntheticGraph(1700, 8000, 30);
    const { clusters, clusterCount } = detectClusters(counts.length, edges);
    expect(clusters).toHaveLength(1700);
    expect(clusterCount).toBeLessThanOrEqual(12);
    expect(clusterCount).toBeGreaterThan(1);
    for (const c of clusters) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(clusterCount);
    }
    const s = sizes(clusters, clusterCount);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeLessThanOrEqual(s[i - 1]!);
    expect(Math.min(...s)).toBeGreaterThan(0);
  });

  it('merges a tiny community into the neighbor it shares most weight with', () => {
    // Two big cliques; nodes 20 and 21 form a pair tied strongly to clique B.
    const a = Array.from({ length: 10 }, (_, i) => i);
    const b = Array.from({ length: 10 }, (_, i) => i + 10);
    const edges = [...clique(a, 5), ...clique(b, 5), { source: 9, target: 10, weight: 1 }];
    edges.push({ source: 20, target: 21, weight: 50 });
    edges.push({ source: 0, target: 20, weight: 1 }, { source: 15, target: 21, weight: 3 });
    const { clusters, clusterCount } = detectClusters(22, edges);
    expect(clusterCount).toBe(2);
    expect(clusters[20]).toBe(clusters[10]);
    expect(clusters[21]).toBe(clusters[10]);
  });

  it('puts isolated nodes into the largest cluster (0)', () => {
    const edges = [...clique([0, 1, 2, 3, 4], 2), ...clique([5, 6, 7], 2), { source: 4, target: 5, weight: 1 }];
    const { clusters } = detectClusters(10, edges);
    expect(clusters[8]).toBe(0);
    expect(clusters[9]).toBe(0);
  });

  it('handles 0 nodes, 1 node and a graph with no edges', () => {
    expect(detectClusters(0, [])).toEqual({ clusters: [], clusterCount: 0 });
    expect(detectClusters(1, [])).toEqual({ clusters: [0], clusterCount: 1 });
    expect(detectClusters(4, [])).toEqual({ clusters: [0, 0, 0, 0], clusterCount: 1 });
  });

  it('is deterministic', () => {
    const { counts, edges } = syntheticGraph(500, 2000, 10, 3);
    expect(detectClusters(counts.length, edges)).toEqual(detectClusters(counts.length, edges));
  });
});
