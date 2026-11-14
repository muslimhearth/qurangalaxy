import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntry, HISTORY_KEY, HISTORY_MAX, readState, removeEntry, SAVE_KEY, useSearchHistory } from './history';

describe('addEntry', () => {
  it('puts the newest search first', () => {
    const list = addEntry([{ query: 'light', mode: 'roots' }], { query: 'patience', mode: 'verses' });
    expect(list).toEqual([
      { query: 'patience', mode: 'verses' },
      { query: 'light', mode: 'roots' },
    ]);
  });

  it('moves a repeated search to the top instead of adding it twice', () => {
    const list = addEntry(
      [
        { query: 'a', mode: 'roots' },
        { query: 'Light', mode: 'roots' },
      ],
      { query: ' light ', mode: 'roots' },
    );
    expect(list).toEqual([
      { query: 'light', mode: 'roots' },
      { query: 'a', mode: 'roots' },
    ]);
  });

  it('keeps the same text in another mode as its own entry', () => {
    expect(addEntry([{ query: 'light', mode: 'roots' }], { query: 'light', mode: 'verses' })).toHaveLength(2);
  });

  it('keeps only the last 10 and ignores empty searches', () => {
    let list: ReturnType<typeof addEntry> = [];
    for (let i = 0; i < 12; i++) list = addEntry(list, { query: `q${i}`, mode: 'roots' });
    expect(list).toHaveLength(HISTORY_MAX);
    expect(list[0]!.query).toBe('q11');
    expect(addEntry(list, { query: '  ', mode: 'roots' })).toBe(list);
  });
});

describe('removeEntry', () => {
  it('removes one entry', () => {
    const list = [
      { query: 'a', mode: 'roots' as const },
      { query: 'a', mode: 'verses' as const },
    ];
    expect(removeEntry(list, { query: 'a', mode: 'verses' })).toEqual([{ query: 'a', mode: 'roots' }]);
  });
});

describe('readState', () => {
  afterEach(() => localStorage.clear());

  it('defaults to saving and an empty history', () => {
    expect(readState()).toEqual({ entries: [], saving: true });
  });

  it('reads saved entries and drops malformed ones', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ query: 'x', mode: 'verses' }, { query: 3 }, 'junk']));
    expect(readState()).toEqual({ entries: [{ query: 'x', mode: 'verses' }], saving: true });
    localStorage.setItem(SAVE_KEY, 'false');
    expect(readState()).toEqual({ entries: [], saving: false });
  });

  it('survives broken JSON and a blocked storage', () => {
    localStorage.setItem(HISTORY_KEY, '{');
    expect(readState().entries).toEqual([]);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readState()).toEqual({ entries: [], saving: true });
    spy.mockRestore();
  });
});

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchHistory.setState({ entries: [], saving: true });
  });

  it('records searches and saves them', () => {
    useSearchHistory.getState().record({ query: 'light', mode: 'roots' });
    expect(useSearchHistory.getState().entries).toEqual([{ query: 'light', mode: 'roots' }]);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual([{ query: 'light', mode: 'roots' }]);
  });

  it('removes an entry', () => {
    useSearchHistory.getState().record({ query: 'light', mode: 'roots' });
    useSearchHistory.getState().remove({ query: 'light', mode: 'roots' });
    expect(useSearchHistory.getState().entries).toEqual([]);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual([]);
  });

  it('clears all entries and keeps saving on', () => {
    useSearchHistory.getState().record({ query: 'light', mode: 'roots' });
    useSearchHistory.getState().clear();
    expect(useSearchHistory.getState()).toMatchObject({ entries: [], saving: true });
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('turning saving off clears the history and stops recording', () => {
    useSearchHistory.getState().record({ query: 'light', mode: 'roots' });
    useSearchHistory.getState().setSaving(false);
    useSearchHistory.getState().record({ query: 'sea', mode: 'roots' });
    expect(useSearchHistory.getState().entries).toEqual([]);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBe('false');
    useSearchHistory.getState().setSaving(true);
    expect(localStorage.getItem(SAVE_KEY)).toBe('true');
  });

  it('keeps working when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    useSearchHistory.getState().record({ query: 'light', mode: 'roots' });
    expect(useSearchHistory.getState().entries).toHaveLength(1);
    spy.mockRestore();
  });
});
