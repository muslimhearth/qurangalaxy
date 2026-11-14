import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { fixtureGalaxy, fixtureOccurrences, fixtureVerses } from '../data/fixture';
import type { SemanticService } from '../semantic/service';
import { DEBOUNCE_MS } from '../semantic/useSemanticSearch';
import { useGalaxyStore } from '../state/store';
import { buildWordForms, indexWordForms } from '../search/wordForms';
import { setWordForms } from '../search/wordFormsLoad';
import { useVerseWeight } from '../verses/verseWeight';
import { SearchBox } from './SearchBox';

const fakeService = (): SemanticService => ({
  warm: vi.fn(async () => {}),
  search: vi.fn(async () => [{ id: 0, score: 1, reason: { kind: 'semantic' as const, text: 'noise' } }]),
  searchVerses: vi.fn(async () => [{ key: '1:4' as const, sim: 0.9 }]),
});

const input = () => screen.getByRole('combobox');
const options = () => screen.queryAllByRole('option');

describe('SearchBox Arabic search', () => {
  beforeEach(() => {
    // Fixture mode: verses, occurrences and word forms come from the in-memory fixture.
    window.history.replaceState(null, '', '/?fixture');
    setWordForms(null);
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    useVerseWeight.setState({ weight: 0.5 });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('roots mode: an inflected Quran word finds its root once the word forms load', async () => {
    render(<SearchBox semanticService={fakeService} />);
    fireEvent.change(input(), { target: { value: 'الرحمن' } });
    const option = await screen.findByRole('option');
    expect(option).toHaveTextContent('رحم');
    // The note shows the Quran word that matched.
    expect(option).toHaveTextContent(fixtureVerses['1:3']!.ar.split(' ')[0]!);
  });

  it('roots mode: no meaning search for Arabic, even with the slider up', async () => {
    vi.useFakeTimers();
    setWordForms(indexWordForms(buildWordForms(fixtureVerses, fixtureOccurrences)));
    useGalaxyStore.getState().setSemanticWeight(1);
    const service = fakeService();
    render(<SearchBox semanticService={() => service} />);
    fireEvent.change(input(), { target: { value: 'الرحمن' } });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS * 2));
    expect(service.search).not.toHaveBeenCalled();
    expect(options().map((o) => o.id)).toEqual(['root-option-2']);
    expect(useGalaxyStore.getState().semanticWeight).toBe(1);
  });

  it('verses mode: finds verses by Arabic words and marks them in the Arabic text', async () => {
    const service = fakeService();
    render(<SearchBox semanticService={() => service} />);
    act(() => useGalaxyStore.getState().setSearchMode('verses'));
    fireEvent.change(input(), { target: { value: 'الرحيم' } });
    await screen.findAllByRole('option');
    expect(options().map((o) => o.id)).toEqual(['verse-option-1-1', 'verse-option-1-3']);
    // The typed word and the other form of its root (ٱلرَّحْمَٰنِ) are marked.
    const marks = [...options()[0]!.querySelectorAll('.verse-hit-ar mark')].map((m) => m.textContent);
    expect(marks).toEqual(fixtureVerses['1:1']!.ar.split(' ').slice(2, 4));
    expect(service.searchVerses).not.toHaveBeenCalled();
  });
});
