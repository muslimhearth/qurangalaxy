import { create } from 'zustand';
import { activeTab, addTab, closeTab, initialTabs, setActive, updateActive, type TabView, type Tabs } from './model';
import { loadTabs, saveTabs } from './persist';

/** In-app tabs. Kept apart from the shared galaxy store; `connectTabs` joins the two. */
export interface TabsState extends Tabs {
  /** Opens a tab after the active one and returns its id. `activate: false` opens it in the background. */
  open: (view?: Partial<TabView>, activate?: boolean) => string;
  /** Switches to a tab. */
  activate: (id: string) => void;
  /** Closes a tab; the last one is replaced by an empty tab. */
  close: (id: string) => void;
  /** Writes view fields into the active tab. */
  update: (view: Partial<TabView>) => void;
}

const data = (s: Tabs): Tabs => ({ tabs: s.tabs, activeId: s.activeId });

export const useTabsStore = create<TabsState>()((set, get) => ({
  ...(loadTabs() ?? initialTabs()),
  open: (view = {}, activate = true) => {
    const before = data(get());
    const next = addTab(before, view, activate);
    set(next);
    // The new tab is the only id not in the old list.
    return next.tabs.find((t) => !before.tabs.includes(t))!.id;
  },
  activate: (id) => set(setActive(data(get()), id)),
  close: (id) => set(closeTab(data(get()), id)),
  update: (view) => {
    const cur = data(get());
    const next = updateActive(cur, view);
    if (next !== cur) set(next);
  },
}));

// Every change is saved, so tabs survive a reload.
useTabsStore.subscribe((s) => saveTabs(data(s)));

/** Tests: start over with one empty tab, or with what localStorage holds. */
export function resetTabs({ fromStorage = false } = {}) {
  useTabsStore.setState(fromStorage ? (loadTabs() ?? initialTabs()) : initialTabs());
}

/** View of the active tab. */
export const activeView = (): TabView => activeTab(useTabsStore.getState());
