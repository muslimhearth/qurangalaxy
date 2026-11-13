import { useEffect, useState } from 'react';
import type { Occurrence, Verses } from '../data/types';
import { loadOccurrences, loadVerses } from '../data/load';

/** Detail data for one root: its verse occurrences and the verse texts. */
export interface RootDetails {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Occurrences of the root, in Quran order. Empty until ready. */
  occurrences: Occurrence[];
  /** All verses, keyed by "surah:ayah". Null until ready. */
  verses: Verses | null;
  /** Error message when status is 'error'. */
  error?: string;
}

const IDLE: RootDetails = { status: 'idle', occurrences: [], verses: null };
const LOADING: RootDetails = { status: 'loading', occurrences: [], verses: null };

/**
 * Lazily loads occurrences.json and verses.json on the first selection,
 * then returns the details of root `id`. Files load once and are shared.
 */
export function useRootDetails(id: number | null): RootDetails {
  const [state, setState] = useState<{ id: number | null; details: RootDetails }>({ id: null, details: IDLE });

  useEffect(() => {
    if (id === null) return;
    let active = true;
    Promise.all([loadOccurrences(), loadVerses()]).then(
      ([occurrences, verses]) => {
        if (active) setState({ id, details: { status: 'ready', occurrences: occurrences[id] ?? [], verses } });
      },
      (err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        if (active) setState({ id, details: { status: 'error', occurrences: [], verses: null, error } });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (id === null) return IDLE;
  // Until the effect for this id finishes, report loading (not the previous root's data).
  return state.id === id ? state.details : LOADING;
}
