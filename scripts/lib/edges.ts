import type { Edge, Occurrences } from '../../src/data/types';

/**
 * Links roots that share verses. Weight = number of verses with both roots.
 * Keeps each root's top `topK` edges (ties: lower other id), then returns the union,
 * sorted by source then target, with `source < target`.
 */
export function cooccurrenceEdges(occurrences: Occurrences, topK: number): Edge[] {
  // Collect the root ids of each verse. Ids are pushed in increasing order.
  const verseRoots = new Map<string, number[]>();
  occurrences.forEach((list, id) => {
    for (const { v } of list) {
      const ids = verseRoots.get(v) ?? [];
      ids.push(id);
      verseRoots.set(v, ids);
    }
  });

  // Count every pair once per verse. Key a*n+b with a < b.
  const n = occurrences.length;
  const weights = new Map<number, number>();
  for (const ids of verseRoots.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = ids[i]! * n + ids[j]!;
        weights.set(key, (weights.get(key) ?? 0) + 1);
      }
    }
  }

  // Edge list per root, so we can pick each root's strongest links.
  const perRoot: Edge[][] = Array.from({ length: n }, () => []);
  for (const [key, weight] of weights) {
    const edge: Edge = { source: Math.floor(key / n), target: key % n, weight };
    perRoot[edge.source]!.push(edge);
    perRoot[edge.target]!.push(edge);
  }

  const kept = new Set<Edge>();
  perRoot.forEach((edges, id) => {
    const other = (e: Edge) => (e.source === id ? e.target : e.source);
    edges.sort((a, b) => b.weight - a.weight || other(a) - other(b));
    for (const e of edges.slice(0, topK)) kept.add(e);
  });
  return [...kept].sort((a, b) => a.source - b.source || a.target - b.target);
}
