import { useEffect, useState } from 'react';
import { useGalaxyStore } from '../state/store';
import { barInset, NO_INSET, panelInset, type Inset } from './inset';

/** Selector of the root panel rendered by the UI overlay. */
const PANEL = '.root-panel';
/** Selector of the search bar row (not its result list, so typing does not move the view). */
const BAR = '.search-row';

/**
 * Screen area covered by the root panel and the search bar while a root is selected.
 * Re-measures when the panel or the window changes size.
 */
export function usePanelInset(): Inset {
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const [inset, setInset] = useState(NO_INSET);

  useEffect(() => {
    if (selectedId === null) {
      setInset(NO_INSET);
      return;
    }
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const el = document.querySelector(PANEL);
      const panel = panelInset(el?.getBoundingClientRect() ?? null, innerWidth, innerHeight);
      const next = { ...panel, top: barInset(document.querySelector(BAR)?.getBoundingClientRect() ?? null) };
      // Keep the old object when nothing changed, so consumers do not re-run.
      setInset((old) =>
        old.right === next.right && old.bottom === next.bottom && old.top === next.top ? old : next,
      );
    };
    // The panel mounts in the same commit as the selection; wait one frame for its layout.
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector(PANEL);
      if (el) {
        observer = new ResizeObserver(measure);
        observer.observe(el);
      }
      measure();
    });
    addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      removeEventListener('resize', measure);
    };
  }, [selectedId]);

  return inset;
}
