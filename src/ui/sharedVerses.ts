import { useEffect, useState } from 'react';
import { loadOccurrences, loadVerses } from '../data/load';
import type { Occurrence, Verses } from '../data/types';

/** Occurrences in `a` whose verse also holds a word of `b`, in `a`'s order (Quran order). */
export function sharedOccurrences(a: readonly Occurrence[], b: readonly Occurrence[]): Occurrence[] {
  const inB = new Set(b.map((o) => o.v));
  return a.filter((o) => inB.has(o.v));
}

/** The verses two roots share, ready for `VerseList`. Null while loading or after an error. */
export interface SharedVerses {
  /** Occurrences of the first root in the shared verses. */
  occurrences: Occurrence[];
  /** All occurrences of the second root, to mark its words too. */
  others: Occurrence[];
  verses: Verses;
}

/**
 * Loads (cached) occurrences and verses and returns the verses roots `a` and `b` share.
 * Null until loaded, on error, or when either id is null.
 */
export function useSharedVerses(a: number | null, b: number | null): SharedVerses | null {
  const [state, setState] = useState<{ key: string; value: SharedVerses } | null>(null);
  const key = `${a}-${b}`;
  useEffect(() => {
    if (a === null || b === null) return;
    let active = true;
    Promise.all([loadOccurrences(), loadVerses()]).then(
      ([occ, verses]) => {
        const others = occ[b] ?? [];
        if (active) setState({ key, value: { occurrences: sharedOccurrences(occ[a] ?? [], others), others, verses } });
      },
      () => {}, // RootPanel already reports a failed verse load.
    );
    return () => {
      active = false;
    };
  }, [a, b, key]);
  return state?.key === key && a !== null && b !== null ? state.value : null;
}
