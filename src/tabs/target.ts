import type { VerseKey } from '../data/types';
import { useGalaxyStore } from '../state/store';
import type { TabView } from './model';

/** What a link opens: a root (star) or a verse. */
export type TabTarget = { root: number } | { verse: VerseKey };

/** A target, or a bare root id (the older root-only form). */
export type TargetLike = TabTarget | number;

/** Normalizes a bare root id to `{ root }`. */
export function toTarget(t: TargetLike): TabTarget {
  return typeof t === 'number' ? { root: t } : t;
}

/** The tab view that shows a target. */
export function targetView(t: TabTarget): Partial<TabView> {
  return 'root' in t ? { selectedId: t.root } : { openVerse: t.verse };
}

/**
 * Shows a target in the current tab. A root closes the verse panel and clears the search,
 * so its panel shows; a verse opens the verse panel.
 */
export function showTarget(t: TabTarget): void {
  const g = useGalaxyStore.getState();
  if ('root' in t) {
    g.setOpenVerse(null);
    g.setQuery('');
    g.select(t.root);
  } else {
    g.setOpenVerse(t.verse);
  }
}
