import type { Edge, Root } from '../data/types';

/** One neighbor of a root: the other root's id, the edge index and its weight. */
export interface Neighbor {
  id: number;
  edge: number;
  weight: number;
}

/** Neighbor lists per root id, each sorted by edge weight, strongest first. */
export type Adjacency = Neighbor[][];

/** Builds neighbor lists for `rootCount` roots from undirected edges. */
export function buildAdjacency(rootCount: number, edges: readonly Edge[]): Adjacency {
  const adj: Adjacency = Array.from({ length: rootCount }, () => []);
  edges.forEach((e, i) => {
    adj[e.source]?.push({ id: e.target, edge: i, weight: e.weight });
    adj[e.target]?.push({ id: e.source, edge: i, weight: e.weight });
  });
  // Stable sort keeps edge order for equal weights.
  for (const list of adj) list.sort((a, b) => b.weight - a.weight);
  return adj;
}

/** Ids of the `n` roots with the highest word count, highest first. */
export function topByCount(roots: readonly Root[], n: number): number[] {
  return [...roots]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((r) => r.id);
}
