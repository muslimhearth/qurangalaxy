import { useEffect, useRef } from 'react';
import { useGalaxyStore } from '../state/store';
import { hashForRoot, parseRootHash } from './helpers';

/**
 * Keeps the selection and the URL hash (`#/root/<arabic>`) in sync both ways:
 * applies a deep link once the galaxy loads, pushes a history entry per selection,
 * and follows back/forward navigation.
 */
export function useHashSync() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  const deepLinkDone = useRef(false);

  // Store -> URL. The first run after load applies the deep link instead.
  useEffect(() => {
    if (!galaxy) return;
    if (!deepLinkDone.current) {
      deepLinkDone.current = true;
      const linkedId = parseRootHash(window.location.hash, galaxy.roots);
      if (linkedId !== null && linkedId !== selectedId) {
        select(linkedId);
        return;
      }
    }
    const root = selectedId === null ? undefined : galaxy.roots[selectedId];
    const wanted = root ? hashForRoot(root) : '';
    if (window.location.hash === wanted) return;
    // pushState (unlike setting location.hash) fires no hashchange, so no feedback loop.
    const { pathname, search } = window.location;
    window.history.pushState(null, '', pathname + search + wanted);
  }, [galaxy, selectedId, select]);

  // URL -> store, for back/forward and hand-edited hashes.
  useEffect(() => {
    if (!galaxy) return;
    const onNavigate = () => {
      const id = parseRootHash(window.location.hash, galaxy.roots);
      if (id !== useGalaxyStore.getState().selectedId) select(id);
    };
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
    };
  }, [galaxy, select]);
}
