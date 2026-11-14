import type { Galaxy, VerseKey } from '../data/types';
import type { SearchMode } from '../state/store';

/** What one tab remembers: the selection and the search state of the shared store. */
export interface TabView {
  selectedId: number | null;
  query: string;
  searchMode: SearchMode;
  openVerse: VerseKey | null;
}

/** One in-app tab: a view plus a stable id. */
export interface Tab extends TabView {
  id: string;
  /** Tab that opened this one in the background; cleared once the user changes this tab. */
  opener?: string;
}

/** All tabs, in bar order, and the id of the active one. */
export interface Tabs {
  tabs: Tab[];
  activeId: string;
}

/** A view with nothing selected and no search. */
export const EMPTY_VIEW: TabView = { selectedId: null, query: '', searchMode: 'roots', openVerse: null };

const KEYS: (keyof TabView)[] = ['selectedId', 'query', 'searchMode', 'openVerse'];

let counter = 0;
/** New tab id, unique within the page and across reloads (time + counter). */
const newId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

/** True when two views hold the same values. */
export function sameView(a: TabView, b: TabView): boolean {
  return KEYS.every((k) => a[k] === b[k]);
}

/** True when a view shows nothing: no root, no verse, no search text. */
export function isEmptyView(v: TabView): boolean {
  return v.selectedId === null && v.openVerse === null && v.query.trim() === '';
}

/** One empty, active tab. */
export function initialTabs(): Tabs {
  const tab = { id: newId(), ...EMPTY_VIEW };
  return { tabs: [tab], activeId: tab.id };
}

/** The active tab (the first one if the active id is stale). */
export function activeTab(t: Tabs): Tab {
  return t.tabs.find((x) => x.id === t.activeId) ?? t.tabs[0]!;
}

/** Adds a tab right after the active one (like a browser link opened in a new tab). */
export function addTab(t: Tabs, view: Partial<TabView>, activate = true): Tabs {
  const tab: Tab = { id: newId(), ...EMPTY_VIEW, ...view };
  const at = t.tabs.findIndex((x) => x.id === t.activeId) + 1;
  // Background tabs opened one after another keep their opening order.
  let end = at;
  while (!activate && end < t.tabs.length && t.tabs[end]!.opener === t.activeId) end++;
  const tabs = [...t.tabs.slice(0, end), activate ? tab : { ...tab, opener: t.activeId }, ...t.tabs.slice(end)];
  return { tabs, activeId: activate ? tab.id : t.activeId };
}

/** Makes a tab active. Unknown ids change nothing. */
export function setActive(t: Tabs, id: string): Tabs {
  if (id === t.activeId || !t.tabs.some((x) => x.id === id)) return t;
  return { ...t, activeId: id };
}

/**
 * Closes a tab. A closed active tab hands over to its right neighbor, else its left one.
 * Closing the last tab leaves one empty tab.
 */
export function closeTab(t: Tabs, id: string): Tabs {
  const i = t.tabs.findIndex((x) => x.id === id);
  if (i < 0) return t;
  if (t.tabs.length === 1) return initialTabs();
  const tabs = t.tabs.filter((x) => x.id !== id);
  if (id !== t.activeId) return { ...t, tabs };
  return { tabs, activeId: (tabs[i] ?? tabs[i - 1])!.id };
}

/** Writes view fields into the active tab. Returns the same object when nothing changes. */
export function updateActive(t: Tabs, view: Partial<TabView>): Tabs {
  const cur = activeTab(t);
  const next = { ...cur, ...view };
  if (sameView(cur, next)) return t;
  // A tab the user has changed is no longer a fresh background tab of its opener.
  delete next.opener;
  return { ...t, tabs: t.tabs.map((x) => (x.id === cur.id ? next : x)) };
}

/** Text on a tab: the root's Arabic, else the open verse, else the search text, else "New tab". */
export function tabLabel(v: TabView, galaxy: Galaxy | null): string {
  if (v.selectedId !== null) return galaxy?.roots[v.selectedId]?.ar ?? '…';
  if (v.openVerse) return v.openVerse;
  const q = v.query.trim();
  return q ? `“${q}”` : 'New tab';
}
