import type { Galaxy } from '../data/types';
import type { TabView } from './model';

/** What a tab shows. The reader comes first because it covers the panel (as in `tabLabel`). */
export type TabKind = 'reader' | 'root' | 'verse' | 'search' | 'empty';

/** The kind of view a tab holds. */
export function tabKind(v: TabView): TabKind {
  if (v.reader) return 'reader';
  if (v.selectedId !== null) return 'root';
  if (v.openVerse) return 'verse';
  return v.query.trim() ? 'search' : 'empty';
}

/** Second line of a tab row in the switcher: a kind word (shown bold) and details. */
export interface TabCaption {
  kind: string;
  detail: string;
}

/** Meanings shown for a root in a caption. */
const MEANINGS = 2;

/**
 * Caption of a tab in the switcher: "Root · r-ḥ-m · mercy", "Reader · surah 2, verse 17",
 * "Verse · 2:255", "Search · Roots". The label line above it gives the name.
 */
export function tabCaption(v: TabView, galaxy: Galaxy | null): TabCaption {
  switch (tabKind(v)) {
    case 'reader':
      return { kind: 'Reader', detail: `surah ${v.reader!.surah}, verse ${v.reader!.verse}` };
    case 'root': {
      const root = galaxy?.roots[v.selectedId!];
      if (!root) return { kind: 'Root', detail: '' };
      return { kind: 'Root', detail: [root.tr, root.en.slice(0, MEANINGS).join(', ')].filter(Boolean).join(' · ') };
    }
    case 'verse':
      return { kind: 'Verse', detail: v.openVerse! };
    case 'search':
      return { kind: 'Search', detail: v.searchMode === 'verses' ? 'Verses' : 'Roots' };
    default:
      return { kind: 'Empty', detail: '' };
  }
}
