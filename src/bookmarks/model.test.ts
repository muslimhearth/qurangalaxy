import { describe, expect, it } from 'vitest';
import { BOOKMARKS_MAX, hasBookmark, readBookmarks, removeBookmark, toggleBookmark, type Bookmark } from './model';

describe('bookmark model', () => {
  it('toggles: adds newest first, removes a second time', () => {
    let list: Bookmark[] = [];
    list = toggleBookmark(list, { root: 2 }, 100);
    list = toggleBookmark(list, { verse: '2:255' }, 200);
    expect(list).toEqual([
      { verse: '2:255', at: 200 },
      { root: 2, at: 100 },
    ]);
    expect(hasBookmark(list, { root: 2 })).toBe(true);
    expect(hasBookmark(list, { root: 3 })).toBe(false);
    list = toggleBookmark(list, { root: 2 }, 300);
    expect(list).toEqual([{ verse: '2:255', at: 200 }]);
  });

  it('a root id and a verse never match each other', () => {
    const list = toggleBookmark([], { root: 2 }, 1);
    expect(hasBookmark(list, { verse: '2:2' })).toBe(false);
  });

  it('removes one bookmark', () => {
    const list = toggleBookmark(toggleBookmark([], { root: 1 }, 1), { root: 2 }, 2);
    expect(removeBookmark(list, { root: 1 })).toEqual([{ root: 2, at: 2 }]);
  });

  it('keeps at most BOOKMARKS_MAX, dropping the oldest', () => {
    let list: Bookmark[] = [];
    for (let i = 0; i <= BOOKMARKS_MAX; i++) list = toggleBookmark(list, { root: i }, i);
    expect(list).toHaveLength(BOOKMARKS_MAX);
    expect(hasBookmark(list, { root: 0 })).toBe(false);
  });

  it('reads stored data: drops broken entries and repeats, sorts newest first', () => {
    const raw = [
      { root: 1, at: 5 },
      { root: -1, at: 6 },
      { root: 1.5, at: 6 },
      { verse: '2:255', at: 9 },
      { verse: '999:1', at: 7 },
      { verse: 'x', at: 7 },
      { root: 1, at: 3 },
      { root: 4 },
      null,
      'junk',
    ];
    expect(readBookmarks(raw)).toEqual([
      { verse: '2:255', at: 9 },
      { root: 1, at: 5 },
      { root: 4, at: 0 },
    ]);
    expect(readBookmarks({ not: 'a list' })).toEqual([]);
  });
});
