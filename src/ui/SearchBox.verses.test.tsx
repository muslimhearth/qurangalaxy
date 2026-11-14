import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { fixtureGalaxy } from '../data/fixture';
import { useSearchHistory } from '../history/history';
import type { SemanticService } from '../semantic/service';
import { DEBOUNCE_MS } from '../semantic/useSemanticSearch';
import { useGalaxyStore } from '../state/store';
import { useVerseWeight } from '../verses/verseWeight';
import { SearchBox } from './SearchBox';
import { resetTabs, useTabsStore } from '../tabs/store';

/** Fake meaning search: every phrase finds verse 1:3. */
const fakeService = (): SemanticService => ({
  warm: vi.fn(async () => {}),
  search: vi.fn(async () => []),
  searchVerses: vi.fn(async () => [{ key: '1:3' as const, sim: 0.9 }]),
});

const input = () => screen.getByRole('combobox');
const options = () => screen.queryAllByRole('option');

describe('SearchBox verse search', () => {
  beforeEach(() => {
    // Fixture mode: verses.json comes from the in-memory fixture (no transliteration).
    window.history.replaceState(null, '', '/?fixture');
    localStorage.clear();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    useSearchHistory.setState({ entries: [], saving: true });
    useVerseWeight.setState({ weight: 0 });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('shows surah rows in Verses mode too, above the verses', async () => {
    useGalaxyStore.getState().setSearchMode('verses');
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.change(input(), { target: { value: 'the opening' } });
    expect(options()[0]).toHaveTextContent('Al-Faatiha');
    fireEvent.click(options()[0]!);
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 1, verse: 1 });
  });

  it('switches to verses and finds them by English words, with the words marked', async () => {
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Verses' }));
    expect(screen.getByRole('combobox', { name: 'Search verses' })).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: 'translation' } });
    expect(await screen.findAllByRole('option')).toHaveLength(4);
    expect(screen.getByTestId('search-count')).toHaveTextContent('4 verses');
    expect(options()[0]).toHaveTextContent('1:1');
    expect(options()[0]!.querySelector('mark')).toHaveTextContent('translation');
  });

  it('opens a verse on tap, keeps the results hidden, and records the search', async () => {
    render(<SearchBox semanticService={fakeService} />);
    act(() => useGalaxyStore.getState().setSearchMode('verses'));
    fireEvent.change(input(), { target: { value: 'translation' } });
    fireEvent.click((await screen.findAllByRole('option'))[1]!);
    expect(useGalaxyStore.getState().openVerse).toBe('1:2');
    expect(useGalaxyStore.getState().query).toBe('translation');
    expect(options()).toHaveLength(0);
    expect(useSearchHistory.getState().entries).toEqual([{ query: 'translation', mode: 'verses' }]);
  });

  it('Ctrl-click and middle-click open a verse result in a background tab', async () => {
    resetTabs();
    render(<SearchBox semanticService={fakeService} />);
    act(() => useGalaxyStore.getState().setSearchMode('verses'));
    fireEvent.change(input(), { target: { value: 'translation' } });
    const found = await screen.findAllByRole('option');
    fireEvent.click(found[1]!, { ctrlKey: true });
    fireEvent(found[2]!, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(useTabsStore.getState().tabs.map((t) => t.openVerse)).toEqual([null, '1:2', '1:3']);
    expect(useGalaxyStore.getState().openVerse).toBeNull();
  });

  it('adds meaning results from the semantic search', async () => {
    vi.useFakeTimers();
    useVerseWeight.setState({ weight: 1 });
    const service = fakeService();
    render(<SearchBox semanticService={() => service} />);
    act(() => useGalaxyStore.getState().setSearchMode('verses'));
    fireEvent.change(input(), { target: { value: 'all praise' } });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    vi.useRealTimers();
    expect(service.searchVerses).toHaveBeenCalledWith('all praise');
    expect((await screen.findAllByRole('option')).map((o) => o.id)).toEqual(['verse-option-1-3']);
  });

  it('says there is no match', async () => {
    render(<SearchBox semanticService={fakeService} />);
    act(() => useGalaxyStore.getState().setSearchMode('verses'));
    fireEvent.change(input(), { target: { value: 'zebra' } });
    expect(await screen.findByText('No verses match.')).toBeInTheDocument();
  });

  it('opens a verse typed as "s v" in roots mode with Enter', () => {
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.change(input(), { target: { value: '3 109' } });
    expect(options()[0]).toHaveTextContent('3:109');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useGalaxyStore.getState()).toMatchObject({ openVerse: '3:109', query: '' });
    expect(useSearchHistory.getState().entries).toEqual([{ query: '3 109', mode: 'roots' }]);
  });

  it('explains a key that names no verse', () => {
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.change(input(), { target: { value: '1:8' } });
    expect(screen.getByText('No verse 1:8. Surah 1 has 7 verses.')).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '115:1' } });
    expect(screen.getByText('No surah 115. There are 114 surahs.')).toBeInTheDocument();
  });

  it('closes the open verse when a root is chosen', () => {
    useGalaxyStore.getState().setOpenVerse('1:1');
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.click(options()[0]!);
    expect(useGalaxyStore.getState()).toMatchObject({ openVerse: null, selectedId: 2 });
  });

  describe('history', () => {
    beforeEach(() => {
      useSearchHistory.setState({
        entries: [
          { query: 'translation', mode: 'verses' },
          { query: 'rhm', mode: 'roots' },
        ],
      });
    });

    it('shows recent searches when the empty field gets focus, and reruns one', async () => {
      render(<SearchBox semanticService={fakeService} />);
      expect(screen.queryByText('Recent searches')).toBeNull();
      fireEvent.focus(input());
      expect(screen.getByText('Recent searches')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^translation/ }));
      expect(useGalaxyStore.getState()).toMatchObject({ searchMode: 'verses', query: 'translation' });
      expect(screen.queryByText('Recent searches')).toBeNull();
      expect(await screen.findAllByRole('option')).toHaveLength(4);
    });

    it('records on Enter, not on each keystroke', () => {
      useSearchHistory.setState({ entries: [] });
      render(<SearchBox semanticService={fakeService} />);
      fireEvent.change(input(), { target: { value: 'r' } });
      fireEvent.change(input(), { target: { value: 'rh' } });
      expect(useSearchHistory.getState().entries).toEqual([]);
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(useSearchHistory.getState().entries[0]).toEqual({ query: 'rh', mode: 'roots' });
    });

    it('does not open the history after a root is picked', () => {
      render(<SearchBox semanticService={fakeService} />);
      fireEvent.focus(input());
      fireEvent.change(input(), { target: { value: 'rh' } });
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(useGalaxyStore.getState().query).toBe('rh');
      expect(screen.queryByText('Recent searches')).toBeNull();
      expect(screen.queryByRole('option')).toBeNull();
    });
  });

  describe('auto focus', () => {
    const stubPointer = (fine: boolean) =>
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: fine && q.includes('pointer: fine'), media: q }));

    it('focuses the field on desktop without opening the history', () => {
      useSearchHistory.setState({ entries: [{ query: 'rhm', mode: 'roots' }] });
      stubPointer(true);
      render(<SearchBox semanticService={fakeService} />);
      expect(input()).toHaveFocus();
      expect(screen.queryByText('Recent searches')).toBeNull();
    });

    it('marks the bar "in use" on a user focus or typing, not on the automatic focus', () => {
      stubPointer(true);
      render(<SearchBox semanticService={fakeService} />);
      const bar = input().closest('.search')!;
      // The tab rail stays in view after load.
      expect(bar).not.toHaveClass('in-use');
      fireEvent.pointerDown(input());
      expect(bar).toHaveClass('in-use');
      fireEvent.blur(input());
      expect(bar).not.toHaveClass('in-use');
      fireEvent.focus(input());
      expect(bar).toHaveClass('in-use');
    });

    it('leaves the field alone on touch screens', () => {
      stubPointer(false);
      render(<SearchBox semanticService={fakeService} />);
      expect(input()).not.toHaveFocus();
    });
  });
});
