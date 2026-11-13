import { useEffect, useRef } from 'react';
import { useGalaxyStore } from '../state/store';
import { joinLayoutHash, splitLayoutHash } from '../mushaf/hash';
import { hashForRoot, parseRootHash } from './helpers';

/**
 * Keeps the selection, the layout and the URL hash (`#/root/<arabic>`, `#/mushaf/root/<arabic>`) in sync both ways:
 * applies a deep link once the galaxy loads, pushes a history entry per selection,
 * and follows back/forward navigation.
 */
export function useHashSync() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  const layout = useGalaxyStore((s) => s.layout);
  const setLayout = useGalaxyStore((s) => s.setLayout);
  const deepLinkDone = useRef(false);

  // Store -> URL. The first run after load applies the deep link instead.
  useEffect(() => {
    if (!galaxy) return;
    if (!deepLinkDone.current) {
      deepLinkDone.current = true;
      const linked = splitLayoutHash(window.location.hash);
      const linkedId = parseRootHash(linked.rootHash, galaxy.roots);
      if (linked.layout !== layout || (linkedId !== null && linkedId !== selectedId)) {
        setLayout(linked.layout);
        if (linkedId !== null) select(linkedId);
        return;
      }
    }
    const root = selectedId === null ? undefined : galaxy.roots[selectedId];
    const wanted = joinLayoutHash(layout, root ? hashForRoot(root) : '');
    if (window.location.hash === wanted) return;
    // pushState (unlike setting location.hash) fires no hashchange, so no feedback loop.
    const { pathname, search } = window.location;
    window.history.pushState(null, '', pathname + search + wanted);
  }, [galaxy, selectedId, select, layout, setLayout]);

  // URL -> store, for back/forward and hand-edited hashes.
  useEffect(() => {
    if (!galaxy) return;
    const onNavigate = () => {
      const linked = splitLayoutHash(window.location.hash);
      const id = parseRootHash(linked.rootHash, galaxy.roots);
      const state = useGalaxyStore.getState();
      if (linked.layout !== state.layout) setLayout(linked.layout);
      if (id !== state.selectedId) select(id);
    };
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
    };
  }, [galaxy, select, setLayout]);
}
