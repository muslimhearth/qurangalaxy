import type { Lemma, Occurrence, Occurrences } from '../../src/data/types';
import type { RootWord } from './morphology';

/** Per-root statistics before layout and transliteration are added. */
export interface RootStats {
  /** Index in the sorted root list. */
  id: number;
  ar: string;
  /** Number of words built from this root. */
  count: number;
  verseCount: number;
  lemmas: Lemma[];
}

/** Roots with ids, plus the occurrence list for each root id. */
export interface Aggregate {
  roots: RootStats[];
  occurrences: Occurrences;
}

/**
 * Groups root words by root. Input must be in Quran order (as in the corpus file).
 * Root ids: count desc, then Arabic string, so id 0 is the most frequent root.
 */
export function aggregateRoots(rootWords: RootWord[]): Aggregate {
  const byRoot = new Map<string, { occ: Occurrence[]; lemmas: Map<string, number> }>();
  for (const { verse, word, root, lemma } of rootWords) {
    let entry = byRoot.get(root);
    if (!entry) {
      entry = { occ: [], lemmas: new Map() };
      byRoot.set(root, entry);
    }
    const last = entry.occ.at(-1);
    if (last?.v === verse) {
      // A word counts once per root, even if two of its segments share the root.
      if (last.w.includes(word)) continue;
      last.w.push(word);
    } else {
      entry.occ.push({ v: verse, w: [word] });
    }
    entry.lemmas.set(lemma, (entry.lemmas.get(lemma) ?? 0) + 1);
  }

  const unsorted = [...byRoot].map(([ar, { occ, lemmas }]) => ({
    ar,
    count: occ.reduce((sum, o) => sum + o.w.length, 0),
    occ,
    lemmas: [...lemmas]
      .map(([lemmaAr, count]): Lemma => ({ ar: lemmaAr, count }))
      .sort((a, b) => b.count - a.count || compare(a.ar, b.ar)),
  }));
  unsorted.sort((a, b) => b.count - a.count || compare(a.ar, b.ar));

  return {
    roots: unsorted.map((r, id) => ({
      id,
      ar: r.ar,
      count: r.count,
      verseCount: r.occ.length,
      lemmas: r.lemmas,
    })),
    occurrences: unsorted.map((r) => r.occ),
  };
}

/** Code-point string order: stable across machines, unlike localeCompare. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
