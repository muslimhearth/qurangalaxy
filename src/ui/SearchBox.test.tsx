import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SemanticService } from '../semantic/service';
import { DEBOUNCE_MS } from '../semantic/useSemanticSearch';
import { SearchBox } from './SearchBox';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';
import { useSearchHistory } from '../history/history';
import { useUnmarked } from '../reader/openSurah';

describe('SearchBox', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  const input = () => screen.getByRole('combobox', { name: /search roots/i });

  /** Presses Escape on `target`; true when the key reached a window listener (e.g. the root panel's). */
  const escapeReachesWindow = (target: Element) => {
    let reached = false;
    const onKey = () => (reached = true);
    window.addEventListener('keydown', onKey);
    fireEvent.keyDown(target, { key: 'Escape' });
    window.removeEventListener('keydown', onKey);
    return reached;
  };

  it('first Escape blurs the field, keeps the text and closes the list; the next one clears it', () => {
    render(<SearchBox />);
    input().focus();
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(escapeReachesWindow(input())).toBe(false);
    expect(input()).not.toHaveFocus();
    expect(useGalaxyStore.getState().query).toBe('rhm');
    expect(screen.queryByRole('option')).toBeNull();
    // Field not focused, text present: Escape clears the text, and the root panel stays open.
    expect(escapeReachesWindow(document.body)).toBe(false);
    expect(useGalaxyStore.getState().query).toBe('');
    // Nothing left to clear: Escape goes on to the panels.
    expect(escapeReachesWindow(document.body)).toBe(true);
  });

  it("stops the browser's own Escape, which clears a search field", () => {
    render(<SearchBox />);
    input().focus();
    fireEvent.change(input(), { target: { value: 'rhm' } });
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(false);
  });

  it('closes the recent searches when focus moves to the gear', () => {
    useSearchHistory.setState({ saving: true, entries: [{ query: 'rhm', mode: 'roots' }] });
    render(<SearchBox />);
    fireEvent.focus(input());
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
    const gear = screen.getByRole('button', { name: /search settings/i });
    fireEvent.blur(input(), { relatedTarget: gear });
    expect(screen.queryByText('Recent searches')).toBeNull();
  });

  it('keeps Escape from the root panel while the empty field has focus', () => {
    render(<SearchBox />);
    input().focus();
    expect(escapeReachesWindow(input())).toBe(false);
    expect(input()).not.toHaveFocus();
  });

  it('leaves Escape in other fields alone', () => {
    render(
      <>
        <input aria-label="other" />
        <SearchBox />
      </>,
    );
    fireEvent.change(input(), { target: { value: 'rhm' } });
    escapeReachesWindow(screen.getByLabelText('other'));
    expect(useGalaxyStore.getState().query).toBe('rhm');
  });

  it('shows matching roots as you type', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(useGalaxyStore.getState().query).toBe('rhm');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('رحم');
    expect(options[0]).toHaveTextContent('r-ḥ-m');
  });

  it('selects a result on click, keeps the query, closes the list and leaves the field', () => {
    render(<SearchBox />);
    input().focus();
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.click(screen.getByRole('option'));
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    expect(useGalaxyStore.getState().query).toBe('rhm');
    expect(input()).toHaveValue('rhm');
    expect(screen.queryByRole('option')).toBeNull();
    // No list or history comes back over the galaxy.
    expect(input()).not.toHaveFocus();
    // Focus again: the same results come back, so the user can pick another one.
    fireEvent.focus(input());
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('records a picked root search once in the history', () => {
    useSearchHistory.setState({ saving: true, entries: [] });
    render(<SearchBox />);
    input().focus();
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useSearchHistory.getState().entries).toEqual([{ query: 'rhm', mode: 'roots' }]);
  });

  it('shows a matching surah as the first row; picking it opens the reader at verse 1 and records it', () => {
    useSearchHistory.setState({ saving: true, entries: [] });
    render(<SearchBox />);
    input().focus();
    fireEvent.change(input(), { target: { value: 'baqara' } });
    const row = screen.getAllByRole('option')[0]!;
    expect(row).toHaveTextContent('البقرة');
    expect(row).toHaveTextContent('Al-Baqara');
    expect(row).toHaveTextContent('The Cow');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 2, verse: 1 });
    expect(useUnmarked.getState().key).toBe('2:1');
    expect(useSearchHistory.getState().entries).toEqual([{ query: 'baqara', mode: 'roots' }]);
    expect(screen.queryByRole('option')).toBeNull();
    expect(input()).not.toHaveFocus();
  });

  it('keeps root results below the surah rows, and no surah row for a verse key', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'surah 1' } });
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Al-Faatiha');
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.change(input(), { target: { value: '1:2' } });
    expect(screen.queryByText('Al-Faatiha')).toBeNull();
  });

  it('shows the number of matching roots at the end of the field', () => {
    render(<SearchBox />);
    expect(screen.queryByTestId('search-count')).toBeNull();
    fireEvent.change(input(), { target: { value: 'r' } });
    expect(screen.getByTestId('search-count')).toHaveTextContent('2 roots');
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(screen.getByTestId('search-count')).toHaveTextContent('1 root');
  });

  describe('with more than 8 matching roots', () => {
    // Test data: 12 roots that all mean "glow" (not a surah name).
    const many = {
      ...fixtureGalaxy,
      roots: Array.from({ length: 12 }, (_, id) => ({
        ...fixtureGalaxy.roots[0]!,
        id,
        tr: `l-${id}`,
        ar: `ن${id}`,
        en: ['glow'],
        lemmas: [],
        count: 100 - id,
      })),
      edges: [],
    };
    beforeEach(() => useGalaxyStore.getState().setGalaxy(many));

    it('shows "8 of 12 roots" and a "Show all" row that expands the list', () => {
      render(<SearchBox />);
      fireEvent.change(input(), { target: { value: 'glow' } });
      expect(screen.getByTestId('search-count')).toHaveTextContent('8 of 12 roots');
      const more = screen.getByRole('option', { name: 'Show all 12 roots' });
      expect(screen.getAllByRole('option')).toHaveLength(9);
      fireEvent.click(more);
      expect(screen.getAllByRole('option')).toHaveLength(12);
      expect(screen.getByTestId('search-count')).toHaveTextContent('12 roots');
      expect(useGalaxyStore.getState().selectedId).toBeNull();
      // A new query starts with the short list again.
      fireEvent.change(input(), { target: { value: 'glo' } });
      expect(screen.getAllByRole('option')).toHaveLength(9);
    });

    it('expands with Enter on the "Show all" row', () => {
      render(<SearchBox />);
      fireEvent.change(input(), { target: { value: 'glow' } });
      fireEvent.keyDown(input(), { key: 'ArrowUp' });
      expect(screen.getByRole('option', { name: 'Show all 12 roots' })).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(screen.getAllByRole('option')).toHaveLength(12);
      expect(useGalaxyStore.getState().selectedId).toBeNull();
    });
  });

  it('moves through results with arrow keys and selects with Enter', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'r' } }); // r-b-b, r-ḥ-m
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useGalaxyStore.getState().selectedId).toBe(2);
  });

  it('says when nothing matches', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'zzz' } });
    expect(screen.getByText(/no roots match/i)).toBeInTheDocument();
  });

  it("shows each result's English meaning", () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(screen.getByRole('option')).toHaveTextContent('mercy');
  });

  it('shows the matched lemma when a lemma, not the root, matched', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'سماء' } });
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('سَمَآء');
  });

  describe('with meaning search', () => {
    /** Fake semantic search: every query finds حمد (id 3) through verses 1:2 and 1:1. */
    const fakeService = (): SemanticService => ({
      warm: vi.fn(async () => {}),
      searchVerses: vi.fn(async () => []),
      search: vi.fn(async (q: string) => [
        { id: 3, score: 1, reason: { kind: 'semantic' as const, text: q }, verses: ['1:2' as const, '1:1' as const] },
      ]),
    });

    beforeEach(() => {
      vi.useFakeTimers();
      // Fixture mode: verses.json comes from the in-memory fixture.
      window.history.replaceState(null, '', '/?fixture');
    });
    afterEach(() => {
      vi.useRealTimers();
      window.history.replaceState(null, '', '/');
    });

    /** Picks a match mode in the settings popover (opens it first). */
    const pickMode = (name: 'Exact' | 'Hybrid' | 'Semantic') => {
      if (!screen.queryByRole('dialog')) fireEvent.click(screen.getByRole('button', { name: /search settings/i }));
      fireEvent.click(screen.getByRole('radio', { name }));
    };

    it('does not touch the model in exact mode', async () => {
      const service = fakeService();
      render(<SearchBox semanticService={() => service} />);
      fireEvent.change(input(), { target: { value: 'praise' } });
      await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS * 2));
      expect(service.warm).not.toHaveBeenCalled();
      expect(service.search).not.toHaveBeenCalled();
    });

    it('finds roots by meaning and shows the matching verses', async () => {
      const service = fakeService();
      render(<SearchBox semanticService={() => service} />);
      pickMode('Semantic');
      fireEvent.change(input(), { target: { value: 'praise' } });
      await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
      const option = screen.getByRole('option');
      expect(option).toHaveTextContent('حمد');
      expect(option).toHaveTextContent('1:2');
      expect(option).toHaveTextContent('Fixture translation of 1:2');
      fireEvent.click(option);
      expect(useGalaxyStore.getState().selectedId).toBe(3);
    });

    it('keeps exact results while the meaning search runs', async () => {
      const service = fakeService();
      render(<SearchBox semanticService={() => service} />);
      pickMode('Hybrid');
      fireEvent.change(input(), { target: { value: 'rhm' } });
      expect(screen.getByRole('option')).toHaveTextContent('رحم');
      await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
      expect(screen.getAllByRole('option').map((o) => o.id)).toEqual(['root-option-2', 'root-option-3']);
    });
  });
});
