import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTabs, saveTabs, TABS_KEY } from './persist';
import { addTab, initialTabs } from './model';

describe('tab persistence', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('round-trips tabs through localStorage', () => {
    const t = addTab(initialTabs(), { selectedId: 2, query: 'nur', openVerse: '2:255', searchMode: 'verses' });
    saveTabs(t);
    expect(loadTabs()).toEqual(t);
  });

  it('returns null when nothing is stored or the data is broken', () => {
    expect(loadTabs()).toBeNull();
    localStorage.setItem(TABS_KEY, '{oops');
    expect(loadTabs()).toBeNull();
    localStorage.setItem(TABS_KEY, JSON.stringify({ tabs: [], activeId: 'x' }));
    expect(loadTabs()).toBeNull();
  });

  it('drops bad tabs and fixes a stale active id', () => {
    localStorage.setItem(
      TABS_KEY,
      JSON.stringify({
        tabs: [
          { id: 'a', selectedId: 1, query: '', searchMode: 'roots', openVerse: null },
          { id: 'b', selectedId: 'x', query: 3 },
          { id: 'c', selectedId: null, query: 'q', searchMode: 'bogus', openVerse: 'bad' },
        ],
        activeId: 'gone',
      }),
    );
    const t = loadTabs()!;
    expect(t.tabs.map((x) => x.id)).toEqual(['a', 'c']);
    expect(t.tabs[1]).toMatchObject({ searchMode: 'roots', openVerse: null });
    expect(t.activeId).toBe('a');
  });

  it('survives a storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(loadTabs()).toBeNull();
    expect(() => saveTabs(initialTabs())).not.toThrow();
  });
});
