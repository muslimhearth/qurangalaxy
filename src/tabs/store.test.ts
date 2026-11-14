import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeView, resetTabs, useTabsStore } from './store';
import { loadTabs } from './persist';
import { activeTab } from './model';

describe('tabs store', () => {
  beforeEach(() => resetTabs());
  afterEach(() => localStorage.clear());

  it('opens, switches, updates and closes tabs', () => {
    const s = () => useTabsStore.getState();
    const first = s().activeId;
    s().update({ selectedId: 1 });
    const second = s().open({ selectedId: 2 });
    expect(s().activeId).toBe(second);
    s().activate(first);
    expect(activeTab(s()).selectedId).toBe(1);
    s().close(first);
    expect(s().tabs).toHaveLength(1);
    expect(s().activeId).toBe(second);
  });

  it('opens a background tab without switching', () => {
    const s = useTabsStore.getState();
    const id = s.open({ selectedId: 3 }, false);
    expect(useTabsStore.getState().activeId).not.toBe(id);
    expect(useTabsStore.getState().tabs).toHaveLength(2);
  });

  it('saves every change to localStorage', () => {
    useTabsStore.getState().open({ selectedId: 4 });
    expect(loadTabs()?.tabs.map((t) => t.selectedId)).toEqual([null, 4]);
  });

  it('resetTabs reloads what is saved', () => {
    useTabsStore.getState().open({ selectedId: 4 });
    resetTabs({ fromStorage: true });
    expect(useTabsStore.getState().tabs).toHaveLength(2);
    resetTabs();
    expect(useTabsStore.getState().tabs).toHaveLength(1);
  });

  it('opens on an empty tab after a plain visit, but keeps the active tab for a link', () => {
    useTabsStore.getState().activate(useTabsStore.getState().tabs[0]!.id);
    useTabsStore.getState().update({ selectedId: 2 });
    useTabsStore.getState().open({ selectedId: 4 });
    window.history.replaceState(null, '', '/');
    resetTabs({ fromStorage: true });
    expect(activeView().selectedId).toBeNull();
    expect(useTabsStore.getState().tabs).toHaveLength(3);
    useTabsStore.getState().activate(useTabsStore.getState().tabs[1]!.id);
    window.history.replaceState(null, '', '/#/root/x');
    resetTabs({ fromStorage: true });
    expect(activeView().selectedId).toBe(4);
    window.history.replaceState(null, '', '/');
  });
});
