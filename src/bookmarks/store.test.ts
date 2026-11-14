import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOKMARKS_KEY, loadBookmarks, resetBookmarks, useBookmarks } from './store';

describe('bookmark store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetBookmarks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('saves every change to localStorage and loads it back', () => {
    useBookmarks.getState().toggle({ root: 3 });
    useBookmarks.getState().toggle({ verse: '1:2' });
    expect(useBookmarks.getState().has({ root: 3 })).toBe(true);
    expect(loadBookmarks().map((b) => ('root' in b ? b.root : b.verse))).toEqual(['1:2', 3]);
    useBookmarks.getState().remove({ root: 3 });
    expect(loadBookmarks()).toHaveLength(1);
  });

  it('loads nothing from broken JSON', () => {
    localStorage.setItem(BOOKMARKS_KEY, '{oops');
    expect(loadBookmarks()).toEqual([]);
  });

  it('keeps working in memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadBookmarks()).toEqual([]);
    useBookmarks.getState().toggle({ root: 1 });
    expect(useBookmarks.getState().list).toHaveLength(1);
  });
});
