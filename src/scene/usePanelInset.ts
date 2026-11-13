import { useEffect, useState } from 'react';
import { useGalaxyStore } from '../state/store';
import { NO_INSET, panelInset, type Inset } from './inset';

/** Selector of the root panel rendered by the UI overlay. */
const PANEL = '.root-panel';

/**
 * Screen area covered by the root panel while a root is selected.
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
      const next = panelInset(el?.getBoundingClientRect() ?? null, innerWidth, innerHeight);
      // Keep the old object when nothing changed, so consumers do not re-run.
      setInset((old) => (old.right === next.right && old.bottom === next.bottom ? old : next));
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
