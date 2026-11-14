import type { Edge, Occurrences } from '../../src/data/types';

/** Least number of shared verses for a link in galaxy.json. One shared verse says little. */
export const MIN_SHARED = 2;

/**
 * Link strength against chance. `lift` = shared · total / (versesA · versesB): how many times more
 * often the roots share a verse than two random roots of the same sizes. Very common roots get a low
 * lift, so they no longer win every ranking. The log2(1 + shared) factor is a small bonus for more
 * shared verses, so a 2-verse accident between two rare roots does not beat a solid link.
 */
export function linkScore(shared: number, versesA: number, versesB: number, totalVerses: number): number {
  return ((shared * totalVerses) / (versesA * versesB)) * Math.log2(1 + shared);
}

/** The two edge sets of the build. */
export interface EdgeSets {
  /** Each root's top-k by shared verses (weight). Input of the layout step: keeps star positions stable. */
  layout: Edge[];
  /** Each root's top-k by score, with at least `MIN_SHARED` shared verses. Written to galaxy.json. */
  links: Edge[];
}

/**
 * Links roots that share verses. `totalVerses` is the number of verses in the Quran (for the score).
 * Both sets are the union of each root's top `topK` edges, sorted by source then target, with
 * `source < target`. Scores keep 3 significant digits.
 */
export function buildEdges(occurrences: Occurrences, topK: number, totalVerses: number): EdgeSets {
  const n = occurrences.length;
  const weights = pairWeights(occurrences);
  const verses = occurrences.map((list) => list.length);

  const all: Edge[] = [];
  for (const [key, weight] of weights) {
    const source = Math.floor(key / n);
    const target = key % n;
    const score = Number(linkScore(weight, verses[source]!, verses[target]!, totalVerses).toPrecision(3));
    all.push({ source, target, weight, score });
  }
  return {
    layout: topPerRoot(n, all, topK, (a, b) => b.weight - a.weight),
    links: topPerRoot(
      n,
      all.filter((e) => e.weight >= MIN_SHARED),
      topK,
      (a, b) => b.score - a.score || b.weight - a.weight,
    ),
  };
}

/** Shared verse count per root pair, keyed a·n + b with a < b. */
function pairWeights(occurrences: Occurrences): Map<number, number> {
  // Collect the root ids of each verse. Ids are pushed in increasing order.
  const verseRoots = new Map<string, number[]>();
  occurrences.forEach((list, id) => {
    for (const { v } of list) {
      const ids = verseRoots.get(v) ?? [];
      ids.push(id);
      verseRoots.set(v, ids);
    }
  });
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
  return weights;
}

/** Union of each root's top `topK` edges by `order` (ties: lower other id), sorted by source, target. */
function topPerRoot(n: number, edges: Edge[], topK: number, order: (a: Edge, b: Edge) => number): Edge[] {
  const perRoot: Edge[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    perRoot[e.source]!.push(e);
    perRoot[e.target]!.push(e);
  }
  const kept = new Set<Edge>();
  perRoot.forEach((list, id) => {
    const other = (e: Edge) => (e.source === id ? e.target : e.source);
    list.sort((a, b) => order(a, b) || other(a) - other(b));
    for (const e of list.slice(0, topK)) kept.add(e);
  });
  return [...kept].sort((a, b) => a.source - b.source || a.target - b.target);
}
