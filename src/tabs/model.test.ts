import { describe, expect, it } from 'vitest';
import { activeTab, addTab, closeTab, EMPTY_VIEW, freshStart, initialTabs, isEmptyView, sameView, setActive, showsTabs, tabLabel, updateActive } from './model';
import { fixtureGalaxy } from '../data/fixture';

describe('tab model', () => {
  it('starts with one empty active tab', () => {
    const t = initialTabs();
    expect(t.tabs).toHaveLength(1);
    expect(t.activeId).toBe(t.tabs[0]!.id);
    expect(isEmptyView(activeTab(t))).toBe(true);
  });

  it('adds a tab after the active one and activates it by default', () => {
    let t = initialTabs();
    t = addTab(t, { selectedId: 3 });
    expect(t.tabs).toHaveLength(2);
    expect(activeTab(t).selectedId).toBe(3);
    expect(activeTab(t).query).toBe('');
    t = setActive(t, t.tabs[0]!.id);
    t = addTab(t, { selectedId: 5 });
    expect(t.tabs.map((x) => x.selectedId)).toEqual([null, 5, 3]);
  });

  it('adds a background tab without switching', () => {
    const t0 = initialTabs();
    const t = addTab(t0, { selectedId: 2 }, false);
    expect(t.activeId).toBe(t0.activeId);
    expect(t.tabs[1]!.selectedId).toBe(2);
  });

  it('keeps background tabs in opening order', () => {
    let t = initialTabs();
    t = addTab(t, { selectedId: 1 }, false);
    t = addTab(t, { selectedId: 2 }, false);
    expect(t.tabs.map((x) => x.selectedId)).toEqual([null, 1, 2]);
  });

  it('gives every tab a unique id', () => {
    let t = initialTabs();
    for (let i = 0; i < 5; i++) t = addTab(t, {});
    expect(new Set(t.tabs.map((x) => x.id)).size).toBe(6);
  });

  it('closing the active tab activates its right neighbor, else the left one', () => {
    let t = initialTabs();
    t = addTab(t, { selectedId: 1 });
    t = addTab(t, { selectedId: 2 });
    const [a, b, c] = t.tabs;
    t = setActive(t, b!.id);
    t = closeTab(t, b!.id);
    expect(t.activeId).toBe(c!.id);
    t = closeTab(t, c!.id);
    expect(t.activeId).toBe(a!.id);
  });

  it('closing another tab keeps the active one', () => {
    let t = initialTabs();
    t = addTab(t, { selectedId: 1 });
    const active = t.activeId;
    t = closeTab(t, t.tabs[0]!.id);
    expect(t.activeId).toBe(active);
    expect(t.tabs).toHaveLength(1);
  });

  it('closing the last tab leaves one empty tab', () => {
    let t = updateActive(initialTabs(), { selectedId: 4, query: 'nur' });
    t = closeTab(t, t.activeId);
    expect(t.tabs).toHaveLength(1);
    expect(isEmptyView(activeTab(t))).toBe(true);
  });

  it('ignores unknown ids', () => {
    const t = initialTabs();
    expect(setActive(t, 'nope')).toBe(t);
    expect(closeTab(t, 'nope')).toBe(t);
  });

  it('updates only the active tab and keeps the object when nothing changes', () => {
    let t = addTab(initialTabs(), {}, false);
    t = updateActive(t, { query: 'rhm', searchMode: 'verses' });
    expect(activeTab(t)).toMatchObject({ query: 'rhm', searchMode: 'verses' });
    expect(t.tabs[1]!.query).toBe('');
    expect(updateActive(t, { query: 'rhm' })).toBe(t);
  });

  it('compares views field by field', () => {
    expect(sameView(EMPTY_VIEW, { ...EMPTY_VIEW })).toBe(true);
    expect(sameView(EMPTY_VIEW, { ...EMPTY_VIEW, openVerse: '1:1' })).toBe(false);
    // Reader places compare by value.
    const a = { ...EMPTY_VIEW, reader: { surah: 2, verse: 17 } };
    expect(sameView(a, { ...EMPTY_VIEW, reader: { surah: 2, verse: 17 } })).toBe(true);
    expect(sameView(a, { ...EMPTY_VIEW, reader: { surah: 2, verse: 18 } })).toBe(false);
    expect(sameView(a, EMPTY_VIEW)).toBe(false);
  });

  it('labels a tab by root, then verse, then query, else "New tab"', () => {
    const root = fixtureGalaxy.roots[0]!;
    expect(tabLabel({ ...EMPTY_VIEW, selectedId: 0, openVerse: '2:255' }, fixtureGalaxy)).toBe(root.ar);
    expect(tabLabel({ ...EMPTY_VIEW, openVerse: '2:255' }, fixtureGalaxy)).toBe('2:255');
    expect(tabLabel({ ...EMPTY_VIEW, query: ' light ' }, fixtureGalaxy)).toBe('“light”');
    expect(tabLabel(EMPTY_VIEW, fixtureGalaxy)).toBe('New tab');
    // The reader covers the panel, so it names the tab.
    expect(tabLabel({ ...EMPTY_VIEW, selectedId: 0, reader: { surah: 2, verse: 17 } }, fixtureGalaxy)).toBe('Al-Baqara 2:17');
    expect(isEmptyView({ ...EMPTY_VIEW, reader: { surah: 1, verse: 1 } })).toBe(false);
    // Before the galaxy loads, or for a stale id, a root tab still gets a label.
    expect(tabLabel({ ...EMPTY_VIEW, selectedId: 0 }, null)).toBe('…');
  });
});

describe('freshStart', () => {
  it('adds an empty active tab after the saved ones', () => {
    const saved = addTab(initialTabs(), { selectedId: 3 });
    const withRoot = updateActive(setActive(saved, saved.tabs[0]!.id), { selectedId: 5 });
    const t = freshStart(withRoot);
    expect(t.tabs).toHaveLength(3);
    expect(isEmptyView(activeTab(t))).toBe(true);
    expect(t.tabs[2]!.id).toBe(t.activeId);
  });

  it('reuses an empty tab instead of adding another', () => {
    const saved = addTab(initialTabs(), { selectedId: 3 });
    const t = freshStart(saved);
    expect(t.tabs).toHaveLength(2);
    expect(t.activeId).toBe(saved.tabs[0]!.id);
  });
});

describe('showsTabs', () => {
  it('hides the tabs while the only tab is empty', () => {
    expect(showsTabs(initialTabs())).toBe(false);
  });

  it('shows them once the only tab has content, or when there are two tabs', () => {
    expect(showsTabs(updateActive(initialTabs(), { query: 'nur' }))).toBe(true);
    expect(showsTabs(addTab(initialTabs(), {}))).toBe(true);
  });
});
