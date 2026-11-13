import { useEffect } from 'react';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from './fixture';

/** Loads galaxy.json into the store. STUB: uses the fixture until goal G4 (ui) replaces it. */
export function useLoadGalaxy() {
  const setGalaxy = useGalaxyStore((s) => s.setGalaxy);
  useEffect(() => setGalaxy(fixtureGalaxy), [setGalaxy]);
}
