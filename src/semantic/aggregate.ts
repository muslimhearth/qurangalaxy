/** Turns the best-matching verses into scored roots. */
import type { Occurrences, VerseKey } from '../data/types';
import type { Match } from '../search/types';

/** A verse found by the semantic search with its cosine similarity. */
export interface VerseHit {
  key: VerseKey;
  sim: number;
}

/** How many matching verses a semantic result shows. */
export const VERSES_PER_ROOT = 2;

/** Verse key → ids of the roots used in that verse, in root id order. */
export function buildVerseRoots(occurrences: Occurrences): Map<VerseKey, number[]> {
  const map = new Map<VerseKey, number[]>();
  occurrences.forEach((list, id) => {
    for (const { v } of list) {
      const roots = map.get(v);
      if (roots) roots.push(id);
      else map.set(v, [id]);
    }
  });
  return map;
}

/**
 * Inverse verse frequency per root, in 0..1: log(N / verses) / log(N).
 * A root in every verse gets 0, a root in one verse gets 1. This keeps roots like
 * أله, قول and كون (in a third of all verses) from winning every query.
 */
export function rootWeights(occurrences: Occurrences, totalVerses: number): number[] {
  const logN = Math.log(totalVerses);
  return occurrences.map((list) => (list.length === 0 ? 0 : Math.max(0, Math.log(totalVerses / list.length) / logN)));
}

/**
 * Root score = (sum of the similarities of its hit verses) × its weight, then scaled so the
 * best root scores 1. Hits must be sorted best first. Returns matches best first.
 */
export function versesToRoots(
  hits: readonly VerseHit[],
  verseRoots: ReadonlyMap<VerseKey, readonly number[]>,
  weights: readonly number[],
  query: string,
): Match[] {
  const sums = new Map<number, { sum: number; verses: VerseKey[] }>();
  for (const { key, sim } of hits) {
    if (sim <= 0) continue;
    for (const id of verseRoots.get(key) ?? []) {
      let entry = sums.get(id);
      if (!entry) sums.set(id, (entry = { sum: 0, verses: [] }));
      entry.sum += sim;
      if (entry.verses.length < VERSES_PER_ROOT) entry.verses.push(key);
    }
  }
  const scored = [...sums].map(([id, e]) => ({ id, raw: e.sum * (weights[id] ?? 0), verses: e.verses }));
  const best = Math.max(0, ...scored.map((s) => s.raw));
  if (best === 0) return [];
  return scored
    .filter((s) => s.raw > 0)
    .sort((a, b) => b.raw - a.raw || a.id - b.id)
    .map((s) => ({ id: s.id, score: s.raw / best, reason: { kind: 'semantic', text: query }, verses: s.verses }));
}
