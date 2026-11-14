import type { VerseKey } from '../data/types';
import type { Tab, Tabs } from './model';

/** localStorage key for the open tabs. */
export const TABS_KEY = 'qrg.tabs.v1';

const isVerseKey = (v: unknown): v is VerseKey => typeof v === 'string' && /^\d+:\d+$/.test(v);

/** Checks one stored tab; repairs soft fields, rejects tabs with a broken id, root or query. */
function readTab(raw: unknown): Tab | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const okId = typeof r.selectedId === 'number' && Number.isInteger(r.selectedId) && r.selectedId >= 0;
  if (typeof r.id !== 'string' || !(okId || r.selectedId === null) || typeof r.query !== 'string') return null;
  const tab: Tab = {
    id: r.id,
    selectedId: r.selectedId as number | null,
    query: r.query,
    searchMode: r.searchMode === 'verses' ? 'verses' : 'roots',
    openVerse: isVerseKey(r.openVerse) ? r.openVerse : null,
  };
  if (typeof r.opener === 'string') tab.opener = r.opener;
  return tab;
}

/** Reads the saved tabs, or null when there are none, they are broken, or storage is blocked. */
export function loadTabs(): Tabs | null {
  try {
    const raw = JSON.parse(localStorage.getItem(TABS_KEY) ?? 'null') as { tabs?: unknown; activeId?: unknown } | null;
    if (!raw || !Array.isArray(raw.tabs)) return null;
    const tabs = raw.tabs.map(readTab).filter((t): t is Tab => t !== null);
    if (tabs.length === 0) return null;
    const activeId = tabs.some((t) => t.id === raw.activeId) ? (raw.activeId as string) : tabs[0]!.id;
    return { tabs, activeId };
  } catch {
    return null;
  }
}

/** Saves the tabs. Storage errors (private mode, quota) are ignored: tabs then last for the session. */
export function saveTabs(t: Tabs): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify({ tabs: t.tabs, activeId: t.activeId }));
  } catch {
    // Not fatal: tabs work in memory.
  }
}
