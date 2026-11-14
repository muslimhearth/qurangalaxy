/** Search history (last 10 searches) and the "Save search history" setting, kept in localStorage. */
import { create } from 'zustand';
import type { SearchMode } from '../state/store';

/** One past search: its text and the mode it ran in. */
export interface HistoryEntry {
  query: string;
  mode: SearchMode;
}

/** Number of searches kept. */
export const HISTORY_MAX = 10;
/** localStorage key of the history list. */
export const HISTORY_KEY = 'qrg.searchHistory';
/** localStorage key of the "Save search history" setting. */
export const SAVE_KEY = 'qrg.saveSearchHistory';

const same = (a: HistoryEntry, b: HistoryEntry) => a.mode === b.mode && a.query.toLowerCase() === b.query.toLowerCase();

/** Adds a search at the top (trimmed). A repeat moves to the top; the list keeps `HISTORY_MAX`. */
export function addEntry(list: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const query = entry.query.trim();
  if (!query) return list as HistoryEntry[];
  const next = { query, mode: entry.mode };
  return [next, ...list.filter((e) => !same(e, next))].slice(0, HISTORY_MAX);
}

/** The list without `entry`. */
export function removeEntry(list: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return list.filter((e) => !same(e, entry));
}

// Storage can be missing or throw (private mode, blocked site data): history is then per session.
function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Not saved; the in-memory state still works.
  }
}

const isEntry = (e: unknown): e is HistoryEntry =>
  typeof e === 'object' &&
  e !== null &&
  typeof (e as HistoryEntry).query === 'string' &&
  ((e as HistoryEntry).mode === 'roots' || (e as HistoryEntry).mode === 'verses');

/** Reads the saved setting (default on) and history (only when saving is on). */
export function readState(): { entries: HistoryEntry[]; saving: boolean } {
  const saving = get(SAVE_KEY) !== 'false';
  let entries: HistoryEntry[] = [];
  if (saving) {
    try {
      const parsed: unknown = JSON.parse(get(HISTORY_KEY) ?? '[]');
      if (Array.isArray(parsed)) entries = parsed.filter(isEntry).slice(0, HISTORY_MAX);
    } catch {
      // Broken JSON: start with an empty history.
    }
  }
  return { entries, saving };
}

/** History state and actions. */
export interface SearchHistoryState {
  entries: HistoryEntry[];
  /** "Save search history" setting. */
  saving: boolean;
  /** Records a search (when saving is on). */
  record: (entry: HistoryEntry) => void;
  remove: (entry: HistoryEntry) => void;
  /** Turns saving on or off; off also clears the history. */
  setSaving: (on: boolean) => void;
}

/** Store for the search history. */
export const useSearchHistory = create<SearchHistoryState>()((setState, getState) => ({
  ...readState(),
  record: (entry) => {
    if (!getState().saving) return;
    const entries = addEntry(getState().entries, entry);
    setState({ entries });
    set(HISTORY_KEY, JSON.stringify(entries));
  },
  remove: (entry) => {
    const entries = removeEntry(getState().entries, entry);
    setState({ entries });
    set(HISTORY_KEY, JSON.stringify(entries));
  },
  setSaving: (saving) => {
    set(SAVE_KEY, String(saving));
    if (saving) setState({ saving });
    else {
      setState({ saving, entries: [] });
      set(HISTORY_KEY, null);
    }
  },
}));
