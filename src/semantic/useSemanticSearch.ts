/** React hook: debounced semantic search that loads the model only when first needed. */
import { useEffect, useState } from 'react';
import { isArabicQuery } from '../search/arabicKey';
import type { Match } from '../search/types';
import type { VerseHit } from './aggregate';
import type { ProgressListener } from './embedder';
import type { SemanticService } from './service';
import { getWorkerService, onModelProgress } from './workerService';

/** Pause after the last keystroke before a semantic search runs. */
export const DEBOUNCE_MS = 250;

/** off: never used yet. loading: model downloading. ready: model loaded. error: load failed. */
export type SemanticStatus = 'off' | 'loading' | 'ready' | 'error';

/** What the search box shows about semantic search; `T` is a root match or a verse hit. */
export interface SemanticState<T = Match> {
  status: SemanticStatus;
  /** Model download progress, 0..1. */
  progress: number;
  /** Matches for the current query, or null while none are ready (or weight is 0); [] for Arabic queries. */
  matches: T[] | null;
  error?: string;
}

/** Runs one search on the service. */
type Run<T> = (service: SemanticService, query: string) => Promise<T[]>;

// One shared empty result, so memos that depend on `matches` stay stable for Arabic queries.
const NO_MATCHES: never[] = [];

const runRoots: Run<Match> = (s, q) => s.search(q);
const runVerses: Run<VerseHit> = (s, q) => s.searchVerses(q);

/**
 * Runs semantic search for `query` while `weight` > 0. The model starts loading the first
 * time `weight` leaves 0; typing never waits for it (searches run in a worker).
 * Arabic queries are skipped: the model knows English only. They get [] at once, so nothing
 * waits for meaning results and the exact ranking stays as it is.
 */
export function useSemanticSearch(
  query: string,
  weight: number,
  getService: () => SemanticService = getWorkerService,
  subscribe: (l: ProgressListener) => () => void = onModelProgress,
): SemanticState {
  return useSemanticQuery(query, weight, getService, subscribe, runRoots);
}

/** Like `useSemanticSearch`, but finds verses (closest in meaning) instead of roots. */
export function useSemanticVerses(
  query: string,
  weight: number,
  getService: () => SemanticService = getWorkerService,
  subscribe: (l: ProgressListener) => () => void = onModelProgress,
): SemanticState<VerseHit> {
  return useSemanticQuery(query, weight, getService, subscribe, runVerses);
}

function useSemanticQuery<T>(
  query: string,
  weight: number,
  getService: () => SemanticService,
  subscribe: (l: ProgressListener) => () => void,
  run: Run<T>,
): SemanticState<T> {
  const q = query.trim();
  const arabic = isArabicQuery(q);
  const enabled = weight > 0 && !arabic;
  const [status, setStatus] = useState<SemanticStatus>('off');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ query: string; matches: T[] } | null>(null);

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
      run(getService(), q)
        .then((matches) => !cancelled && setResult({ query: q, matches }))
        .catch(() => {}); // A load error is shown by the status; exact results stay usable.
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // getService and run are fixed for the life of the component (tests pass a fake).
  }, [enabled, q]);

  const matches = weight > 0 && arabic ? NO_MATCHES : enabled && result?.query === q ? result.matches : null;
  return { status, progress, matches, error };
}
