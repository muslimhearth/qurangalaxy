import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectTabs } from './connect';
import { resetTabs, useTabsStore } from './store';
import { activeTab } from './model';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

const g = () => useGalaxyStore.getState();
const t = () => useTabsStore.getState();

describe('connectTabs', () => {
  let disconnect = () => {};
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    resetTabs();
  });
  afterEach(() => {
    disconnect();
    localStorage.clear();
  });

  it('applies the active tab to the store on connect (restored tabs)', () => {
    t().update({ selectedId: 2, query: 'nur', searchMode: 'verses', openVerse: '1:2' });
    disconnect = connectTabs();
    expect(g()).toMatchObject({ selectedId: 2, query: 'nur', searchMode: 'verses', openVerse: '1:2' });
  });

  it('records, restores and switches the reader place per tab', () => {
    disconnect = connectTabs();
    g().select(2);
    g().setReader({ surah: 2, verse: 17 });
    expect(activeTab(t()).reader).toEqual({ surah: 2, verse: 17 });
    const first = t().activeId;
    t().open({ selectedId: 4 });
    expect(g().reader).toBeNull();
    t().activate(first);
    expect(g()).toMatchObject({ selectedId: 2, reader: { surah: 2, verse: 17 } });
  });

  it('records store changes in the active tab', () => {
    disconnect = connectTabs();
    g().select(3);
    g().setQuery('rhm');
    g().setSearchMode('verses');
    g().setOpenVerse('1:1');
    expect(activeTab(t())).toMatchObject({ selectedId: 3, query: 'rhm', searchMode: 'verses', openVerse: '1:1' });
  });

  it('switching tabs restores each tab view without mixing them', () => {
    disconnect = connectTabs();
    g().select(1);
    g().setQuery('first');
    const first = t().activeId;
    t().open({ selectedId: 4 });
    expect(g()).toMatchObject({ selectedId: 4, query: '' });
    g().setQuery('second');
    t().activate(first);
    expect(g()).toMatchObject({ selectedId: 1, query: 'first' });
    expect(t().tabs.map((x) => [x.selectedId, x.query])).toEqual([
      [1, 'first'],
      [4, 'second'],
    ]);
  });

  it('a background tab leaves the store alone', () => {
    disconnect = connectTabs();
    g().select(1);
    t().open({ selectedId: 4 }, false);
    expect(g().selectedId).toBe(1);
  });

  it('closing the last tab clears the view', () => {
    disconnect = connectTabs();
    g().select(1);
    g().setQuery('x');
    t().close(t().activeId);
    expect(g()).toMatchObject({ selectedId: null, query: '' });
  });

  it('drops a restored root id that the loaded galaxy does not have', () => {
    t().update({ selectedId: 999 });
    disconnect = connectTabs();
    g().setGalaxy(fixtureGalaxy);
    expect(g().selectedId).toBeNull();
    expect(activeTab(t()).selectedId).toBeNull();
  });

  it('stops syncing after disconnect', () => {
    connectTabs()();
    g().select(2);
    expect(activeTab(t()).selectedId).toBeNull();
  });
});
