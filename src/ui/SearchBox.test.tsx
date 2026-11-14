import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SemanticService } from '../semantic/service';
import { DEBOUNCE_MS } from '../semantic/useSemanticSearch';
import { SearchBox } from './SearchBox';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

describe('SearchBox', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  const input = () => screen.getByRole('combobox', { name: /search roots/i });

  it('lets Escape through to the window when the query is empty', () => {
    render(<SearchBox />);
    let reachedWindow = false;
    const onKey = () => (reachedWindow = true);
    window.addEventListener('keydown', onKey);
    fireEvent.keyDown(input(), { key: 'Escape' });
    window.removeEventListener('keydown', onKey);
    expect(reachedWindow).toBe(true);
  });

  it('keeps Escape in the box while it clears a query', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    let reachedWindow = false;
    const onKey = () => (reachedWindow = true);
    window.addEventListener('keydown', onKey);
    fireEvent.keyDown(input(), { key: 'Escape' });
    window.removeEventListener('keydown', onKey);
    expect(useGalaxyStore.getState().query).toBe('');
    expect(reachedWindow).toBe(false);
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

  it('selects a result on click and clears the query', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.click(screen.getByRole('option'));
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    expect(useGalaxyStore.getState().query).toBe('');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('moves through results with arrow keys and selects with Enter', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'r' } }); // r-b-b, r-ḥ-m
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useGalaxyStore.getState().selectedId).toBe(2);
  });

  it('clears the query with Escape', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(useGalaxyStore.getState().query).toBe('');
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

    /** Opens the search-mode popover (if closed) and returns its slider. */
    const slider = () => {
      if (!screen.queryByRole('slider')) fireEvent.click(screen.getByRole('button', { name: /search mode/i }));
      return screen.getByRole('slider', { name: /search mode/i });
    };

    it('does not touch the model while the slider is at exact', async () => {
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
      fireEvent.change(slider(), { target: { value: '1' } });
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
      fireEvent.change(slider(), { target: { value: '0.5' } });
      fireEvent.change(input(), { target: { value: 'rhm' } });
      expect(screen.getByRole('option')).toHaveTextContent('رحم');
      await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
      expect(screen.getAllByRole('option').map((o) => o.id)).toEqual(['root-option-2', 'root-option-3']);
    });
  });
});
