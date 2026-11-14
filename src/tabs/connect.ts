import { useGalaxyStore, type GalaxyState } from '../state/store';
import { activeTab, type TabView } from './model';
import { useTabsStore } from './store';

/** The tab view held in the shared store. */
const viewOf = (s: GalaxyState): TabView => ({
  selectedId: s.selectedId,
  query: s.query,
  searchMode: s.searchMode,
  openVerse: s.openVerse,
});

/**
 * Joins the tab store and the shared galaxy store:
 * - on connect, the active tab's view goes into the shared store (tabs restored after a reload);
 * - every selection or search change is recorded in the active tab;
 * - a tab switch puts that tab's view into the shared store (`select` makes the camera fly to it).
 * Returns a function that stops the sync.
 */
export function connectTabs(): () => void {
  // While a tab view is being applied, the store passes through mixed states
  // (new root, old query); they must not be recorded into the tab.
  let applying = false;
  const apply = (v: TabView) => {
    applying = true;
    try {
      const g = useGalaxyStore.getState();
      if (g.selectedId !== v.selectedId) g.select(v.selectedId);
      g.setQuery(v.query);
      g.setSearchMode(v.searchMode);
      g.setOpenVerse(v.openVerse);
    } finally {
      applying = false;
    }
  };

  apply(activeTab(useTabsStore.getState()));

  const offGalaxy = useGalaxyStore.subscribe((s, prev) => {
    // A restored tab may name a root id from older data: drop it once the galaxy is known.
    if (s.galaxy && s.selectedId !== null && !s.galaxy.roots[s.selectedId]) {
      s.select(null);
      return;
    }
    if (applying) return;
    const v = viewOf(s);
    const p = viewOf(prev);
    if (v.selectedId !== p.selectedId || v.query !== p.query || v.searchMode !== p.searchMode || v.openVerse !== p.openVerse) {
      useTabsStore.getState().update(v);
    }
  });

  const offTabs = useTabsStore.subscribe((s, prev) => {
    if (s.activeId !== prev.activeId) apply(activeTab(s));
  });

  return () => {
    offGalaxy();
    offTabs();
  };
}
