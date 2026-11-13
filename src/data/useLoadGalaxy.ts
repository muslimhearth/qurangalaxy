import { useEffect } from 'react';
import { useGalaxyStore } from '../state/store';
import { useLoadError } from '../ui/loadError';
import { loadGalaxy } from './load';

/**
 * Loads galaxy.json into the store at startup. On failure, stores the message in `useLoadError`.
 * With `?fixture` in the URL, it uses the fixture data instead (see `load.ts`).
 */
export function useLoadGalaxy() {
  const setGalaxy = useGalaxyStore((s) => s.setGalaxy);
  const setError = useLoadError((s) => s.setError);
  useEffect(() => {
    let active = true;
    loadGalaxy().then(
      (galaxy) => active && setGalaxy(galaxy),
      (err: unknown) => active && setError(err instanceof Error ? err.message : String(err)),
    );
    // StrictMode runs effects twice; the shared promise keeps it to one fetch.
    return () => {
      active = false;
    };
  }, [setGalaxy, setError]);
}
