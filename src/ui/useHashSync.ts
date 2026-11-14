import { useEffect, useRef } from 'react';
import { useGalaxyStore } from '../state/store';
import { hashForVerse, parseVerseHash } from '../verses/hash';
import { hashForRoot, parseRootHash } from './helpers';

/**
 * Keeps the selection, the open verse and the URL hash (`#/root/<arabic>`, `#/verse/<s:v>`)
 * in sync both ways: applies a deep link once the galaxy loads, pushes a history entry per
 * change, and follows back/forward navigation. An open verse wins over the selected root.
 */
export function useHashSync() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const openVerse = useGalaxyStore((s) => s.openVerse);
  const select = useGalaxyStore((s) => s.select);
  const setOpenVerse = useGalaxyStore((s) => s.setOpenVerse);
  const deepLinkDone = useRef(false);

  // Store -> URL. The first run after load applies the deep link instead.
  useEffect(() => {
    if (!galaxy) return;
    if (!deepLinkDone.current) {
      deepLinkDone.current = true;
      const verse = parseVerseHash(window.location.hash);
      if (verse !== null && verse !== openVerse) {
        setOpenVerse(verse);
        return;
      }
      const linkedId = parseRootHash(window.location.hash, galaxy.roots);
      if (linkedId !== null && linkedId !== selectedId) {
        select(linkedId);
        return;
      }
    }
    const root = selectedId === null ? undefined : galaxy.roots[selectedId];
    const wanted = openVerse ? hashForVerse(openVerse) : root ? hashForRoot(root) : '';
    if (window.location.hash === wanted) return;
    // pushState (unlike setting location.hash) fires no hashchange, so no feedback loop.
    const { pathname, search } = window.location;
    window.history.pushState(null, '', pathname + search + wanted);
  }, [galaxy, selectedId, openVerse, select, setOpenVerse]);

  // URL -> store, for back/forward and hand-edited hashes.
  useEffect(() => {
    if (!galaxy) return;
    const onNavigate = () => {
      const state = useGalaxyStore.getState();
      const verse = parseVerseHash(window.location.hash);
      if (verse !== null) {
        if (verse !== state.openVerse) setOpenVerse(verse);
        return;
      }
      if (state.openVerse !== null) setOpenVerse(null);
      const id = parseRootHash(window.location.hash, galaxy.roots);
      if (id !== state.selectedId) select(id);
    };
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
    };
  }, [galaxy, select, setOpenVerse]);
}
