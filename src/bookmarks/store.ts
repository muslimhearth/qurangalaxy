import { create } from 'zustand';
import type { TabTarget } from '../tabs/target';
import { hasBookmark, readBookmarks, removeBookmark, toggleBookmark, type Bookmark } from './model';

/** localStorage key for the bookmarks. */
export const BOOKMARKS_KEY = 'qrg.bookmarks.v1';

/** Reads the saved bookmarks; empty when there are none, they are broken, or storage is blocked. */
export function loadBookmarks(): Bookmark[] {
  try {
    return readBookmarks(JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

/** Saves the bookmarks. Storage errors are ignored: bookmarks then last for the session. */
function saveBookmarks(list: Bookmark[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  } catch {
    // Not fatal: bookmarks work in memory.
  }
}

/** Bookmarked roots and verses, newest first, and the actions on them. */
export interface BookmarksState {
  list: Bookmark[];
  /** True when the target is bookmarked. */
  has: (t: TabTarget) => boolean;
  /** Adds the target, or removes it when it is already bookmarked. */
  toggle: (t: TabTarget) => void;
  remove: (t: TabTarget) => void;
}

/** Bookmark store, kept apart from the shared galaxy store. */
export const useBookmarks = create<BookmarksState>()((set, get) => ({
  list: loadBookmarks(),
  has: (t) => hasBookmark(get().list, t),
  toggle: (t) => set({ list: toggleBookmark(get().list, t) }),
  remove: (t) => set({ list: removeBookmark(get().list, t) }),
}));

// Every change is saved, so bookmarks survive a reload.
useBookmarks.subscribe((s, prev) => {
  if (s.list !== prev.list) saveBookmarks(s.list);
});

/** Tests: start over with what localStorage holds. */
export function resetBookmarks(): void {
  useBookmarks.setState({ list: loadBookmarks() });
}
