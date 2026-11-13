import type { Edge, Root } from '../data/types';

/** One neighbor of a root: the other root's id, the edge index and its weight. */
export interface Neighbor {
  id: number;
  edge: number;
  weight: number;
}

/** Neighbor lists per root id, each sorted by edge weight, strongest first. */
export type Adjacency = Neighbor[][];

/**
 * Builds neighbor lists for `rootCount` roots from undirected edges. Equal weights go by
 * word count (`counts`, highest first) when given, as in the panel's "Connected roots" list,
 * so the ring and the list agree; else by edge order.
 */
export function buildAdjacency(rootCount: number, edges: readonly Edge[], counts?: readonly number[]): Adjacency {
  const adj: Adjacency = Array.from({ length: rootCount }, () => []);
  edges.forEach((e, i) => {
    adj[e.source]?.push({ id: e.target, edge: i, weight: e.weight });
    adj[e.target]?.push({ id: e.source, edge: i, weight: e.weight });
  });
  const count = (id: number) => counts?.[id] ?? 0;
  // Stable sort keeps edge order for full ties.
  for (const list of adj) list.sort((a, b) => b.weight - a.weight || count(b.id) - count(a.id));
  return adj;
}

/** Ids of the `n` roots with the highest word count, highest first. */
export function topByCount(roots: readonly Root[], n: number): number[] {
  return [...roots]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((r) => r.id);
}

/**
 * Number of strongest links a focused root lights up. The same roots form the focus ring and
 * get labels; the rest of its links stay faint, so a hub does not turn into a hairball.
 */
export const TOP_LINKS = 20;

/** The `TOP_LINKS` strongest neighbors of root `id`, strongest first (empty for an unknown id). */
export function topNeighbors(adj: Adjacency, id: number): Neighbor[] {
  return (adj[id] ?? []).slice(0, TOP_LINKS);
}
