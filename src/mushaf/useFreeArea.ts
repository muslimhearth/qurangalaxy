import { useEffect, useState } from 'react';
import { freeArea, type Area, type Rect } from './freeArea';

/** UI bars that sit along the top or bottom edge. The About box counts only as a short bar. */
const BARS = ['.search', '.mushaf-toggle', '.about'];
const PANEL = '.root-panel';

const same = (a: Area, b: Area) =>
  a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

/** Measures the free area once, from the elements now in the document. */
function measure(): Area {
  const w = innerWidth;
  const h = innerHeight;
  const top: Rect[] = [];
  const bottom: Rect[] = [];
  for (const sel of BARS) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    // Skip hidden bars and tall popovers (an opened About box floats over the mosaic).
    if (!r || r.height === 0 || r.height > h / 3) continue;
    ((r.top + r.bottom) / 2 < h / 2 ? top : bottom).push(r);
  }
  const panel = document.querySelector(PANEL)?.getBoundingClientRect() ?? null;
  return freeArea(w, h, { panel: panel && panel.height > 0 ? panel : null, top, bottom });
}

/**
 * Screen area the mosaic may use: not under the search field, the title bar, the toggle or the
 * root panel / bottom sheet. Follows window resizes, panel size changes and panels opening or closing.
 */
export function useFreeArea(): Area {
  const [area, setArea] = useState<Area>(() => measure());

  useEffect(() => {
    let frame = 0;
    let watched: Element[] = [];
    // jsdom (unit tests) has no ResizeObserver; window resizes and mutations still re-measure.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule());
    const update = () => {
      frame = 0;
      setArea((old) => {
        const next = measure();
        return same(old, next) ? old : next;
      });
      // Watch the current panel and bars: they mount and unmount with the selection. Re-observe
      // only when they change, since observing fires the callback once (that would loop).
      const els = [...BARS, PANEL].map((sel) => document.querySelector(sel)).filter((el) => el !== null);
      if (els.length === watched.length && els.every((el, i) => el === watched[i])) return;
      watched = els;
      resize?.disconnect();
      for (const el of els) resize?.observe(el);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Panels mount, unmount and change class (sheet sizes); one measure per frame at most.
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      mutations.disconnect();
      removeEventListener('resize', schedule);
    };
  }, []);

  return area;
}
