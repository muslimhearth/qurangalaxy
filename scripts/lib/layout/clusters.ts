import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import type { Edge } from '../../../src/data/types';
import { seededRandom } from './random';

/** Cluster id per node and the number of clusters. Ids are 0..clusterCount-1, 0 = largest. */
export interface ClusterResult {
  clusters: number[];
  clusterCount: number;
}

/** Most clusters we keep, so each one can get a distinct color. */
export const MAX_CLUSTERS = 12;

/**
 * Groups nodes into communities with seeded Louvain, then merges tiny or surplus
 * communities into their strongest neighbor and numbers clusters by size.
 * Isolated nodes (no edges) join the largest cluster.
 */
export function detectClusters(n: number, edges: Edge[], maxClusters = MAX_CLUSTERS): ClusterResult {
  if (n === 0) return { clusters: [], clusterCount: 0 };
  const valid = edges.filter((e) => e.source !== e.target && e.weight > 0);
  const raw = louvainCommunities(n, valid);
  // Communities smaller than this are noise for coloring: merge them away.
  const minSize = Math.max(3, Math.ceil(n * 0.01));
  const merged = mergeCommunities(raw, valid, maxClusters, minSize);
  return renumberBySize(merged);
}

/** Runs seeded Louvain. Returns a community per node, or -1 for isolated nodes. */
function louvainCommunities(n: number, edges: Edge[]): number[] {
  const graph = new Graph({ type: 'undirected' });
  for (const e of edges) {
    graph.mergeNode(e.source);
    graph.mergeNode(e.target);
    // Sum weights of duplicate edges instead of failing on them.
    graph.updateEdge(e.source, e.target, (attr) => ({ weight: (attr.weight ?? 0) + e.weight }));
  }
  const mapping = graph.order > 0 ? louvain(graph, { getEdgeWeight: 'weight', rng: seededRandom(1) }) : {};
  return Array.from({ length: n }, (_, i) => mapping[i] ?? -1);
}

/**
 * Repeatedly merges the smallest community into the community it shares the
 * most edge weight with, until there are at most maxClusters and none is
 * smaller than minSize. A community with no neighbor merges into the largest.
 */
function mergeCommunities(comm: number[], edges: Edge[], maxClusters: number, minSize: number): number[] {
  const out = [...comm];
  for (;;) {
    const sizes = new Map<number, number>();
    for (const c of out) if (c >= 0) sizes.set(c, (sizes.get(c) ?? 0) + 1);
    if (sizes.size <= 1) return out;
    // Order: by size, then by id, so ties break the same way every run.
    const order = [...sizes].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const [smallest, smallSize] = order[0]!;
    if (sizes.size <= maxClusters && smallSize >= minSize) return out;

    const shared = new Map<number, number>();
    for (const e of edges) {
      const cs = out[e.source]!;
      const ct = out[e.target]!;
      if (cs === smallest && ct !== smallest) shared.set(ct, (shared.get(ct) ?? 0) + e.weight);
      if (ct === smallest && cs !== smallest) shared.set(cs, (shared.get(cs) ?? 0) + e.weight);
    }
    let target = order[order.length - 1]![0];
    let best = 0;
    for (const [c, w] of shared) if (w > best || (w === best && c < target)) [target, best] = [c, w];
    for (let i = 0; i < out.length; i++) if (out[i] === smallest) out[i] = target;
  }
}

/** Gives isolated nodes (-1) the largest community, then renumbers ids by size, largest = 0. */
function renumberBySize(comm: number[]): ClusterResult {
  const sizes = new Map<number, number>();
  for (const c of comm) if (c >= 0) sizes.set(c, (sizes.get(c) ?? 0) + 1);
  // Ties break by first node index, which is stable across runs.
  const firstIndex = (c: number) => comm.indexOf(c);
  const order = [...sizes.keys()].sort((a, b) => sizes.get(b)! - sizes.get(a)! || firstIndex(a) - firstIndex(b));
  const newId = new Map(order.map((c, i) => [c, i]));
  const clusters = comm.map((c) => (c >= 0 ? newId.get(c)! : 0));
  return { clusters, clusterCount: Math.max(1, order.length) };
}
