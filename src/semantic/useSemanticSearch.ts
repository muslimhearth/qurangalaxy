/** React hook: debounced semantic search that loads the model only when first needed. */
import { useEffect, useState } from 'react';
import type { Match } from '../search/types';
import type { ProgressListener } from './embedder';
import type { SemanticService } from './service';
import { getWorkerService, onModelProgress } from './workerService';

/** Pause after the last keystroke before a semantic search runs. */
export const DEBOUNCE_MS = 250;

/** off: never used yet. loading: model downloading. ready: model loaded. error: load failed. */
export type SemanticStatus = 'off' | 'loading' | 'ready' | 'error';

/** What the search box shows about semantic search. */
export interface SemanticState {
  status: SemanticStatus;
  /** Model download progress, 0..1. */
  progress: number;
  /** Matches for the current query, or null while none are ready (or weight is 0). */
  matches: Match[] | null;
  error?: string;
}

/**
 * Runs semantic search for `query` while `weight` > 0. The model starts loading the first
 * time `weight` leaves 0; typing never waits for it (searches run in a worker).
 */
export function useSemanticSearch(
  query: string,
  weight: number,
  getService: () => SemanticService = getWorkerService,
  subscribe: (l: ProgressListener) => () => void = onModelProgress,
): SemanticState {
  const enabled = weight > 0;
  const q = query.trim();
  const [status, setStatus] = useState<SemanticStatus>('off');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ query: string; matches: Match[] } | null>(null);

  // Load the model on first use, and again after a failed load.
  useEffect(() => {
    if (!enabled || status === 'loading' || status === 'ready') return;
    setStatus('loading');
    setError(undefined);
    const unsubscribe = subscribe(setProgress);
    getService()
      .warm()
      .then(() => setStatus('ready'))
      .catch((e: unknown) => {
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(unsubscribe);
    // Only a weight change may start a load; status changes come from this effect itself.
  }, [enabled]);

  // Debounced search for the current query.
  useEffect(() => {
    if (!enabled || !q) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getService()
        .search(q)
        .then((matches) => !cancelled && setResult({ query: q, matches }))
        .catch(() => {}); // A load error is shown by the status; exact results stay usable.
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // getService is fixed for the life of the component (tests pass a fake).
  }, [enabled, q]);

  const matches = enabled && result?.query === q ? result.matches : null;
  return { status, progress, matches, error };
}
