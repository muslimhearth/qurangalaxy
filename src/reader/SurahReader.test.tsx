import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { fixtureGalaxy } from '../data/fixture';
import { resetLoadCache } from '../data/load';
import { useGalaxyStore } from '../state/store';
import { useMeanings } from '../ui/meanings';
import { useVerseFocus } from '../ui/verseFocus';
import { SurahReader } from './SurahReader';

const g = () => useGalaxyStore.getState();

describe('SurahReader', () => {
  beforeEach(() => {
    resetLoadCache();
    // Fixture mode: verses 1:1 to 1:4 and occurrences come from the in-memory fixture.
    window.history.replaceState(null, '', '/?fixture');
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    g().setGalaxy(fixtureGalaxy);
    useMeanings.setState({ show: true });
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('shows nothing while the reader is closed', () => {
    const { container } = render(<SurahReader />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the surah number and names, its verses, and marks the open verse', async () => {
    g().setReader({ surah: 1, verse: 3 });
    render(<SurahReader />);
    const reader = screen.getByRole('complementary', { name: 'Surah reader' });
    expect(within(reader).getByRole('heading', { level: 2 })).toHaveTextContent('1');
    expect(reader).toHaveTextContent('الفاتحة');
    expect(reader).toHaveTextContent('Al-Faatiha');
    expect(await within(reader).findByText('Fixture translation of 1:4')).toBeInTheDocument();
    const items = within(reader).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-verse'))).toEqual(['1:1', '1:2', '1:3', '1:4']);
    expect(items[2]).toHaveAttribute('aria-current', 'true');
    expect(items[2]).toHaveClass('current');
  });

  it('keeps the words of the selected root gold', async () => {
    g().select(2); // رحم: words 3 and 4 of 1:1, words 1 and 2 of 1:3.
    g().setReader({ surah: 1, verse: 1 });
    const { container } = render(<SurahReader />);
    await screen.findByText('Fixture translation of 1:1');
    await act(async () => {}); // Occurrences load after the verses.
    const marks = [...container.querySelectorAll('[data-verse="1:1"] mark')].map((m) => m.textContent);
    expect(marks).toEqual(['ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']);
    expect(container.querySelectorAll('[data-verse="1:2"] mark')).toHaveLength(0);
  });

  it('moves to the previous and next surah; none before the first or after the last', () => {
    g().setReader({ surah: 1, verse: 3 });
    render(<SurahReader />);
    expect(screen.queryByRole('button', { name: /previous surah/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next surah: 2 Al-Baqara' }));
    expect(g().reader).toEqual({ surah: 2, verse: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Previous surah: 1 Al-Faatiha' }));
    expect(g().reader).toEqual({ surah: 1, verse: 1 });
    act(() => g().setReader({ surah: 114, verse: 1 }));
    expect(screen.queryByRole('button', { name: /next surah/i })).toBeNull();
  });

  it('back closes the reader and asks the verse list to show the verse again; Escape too', () => {
    g().setReader({ surah: 1, verse: 3 });
    render(<SurahReader />);
    fireEvent.click(screen.getByRole('button', { name: 'Close the reader' }));
    expect(g().reader).toBeNull();
    expect(useVerseFocus.getState().request?.key).toBe('1:3');
    act(() => g().setReader({ surah: 1, verse: 2 }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(g().reader).toBeNull();
  });

  it('hides the English text when "Show meanings" is off, with a toggle in the header', async () => {
    g().setReader({ surah: 1, verse: 1 });
    render(<SurahReader />);
    expect(await screen.findByText('Fixture translation of 1:1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show meanings' }));
    expect(screen.queryByText('Fixture translation of 1:1')).toBeNull();
  });

  it('marks no verse after previous or next surah, but marks a verse opened later', async () => {
    g().setReader({ surah: 1, verse: 3 });
    render(<SurahReader />);
    fireEvent.click(screen.getByRole('button', { name: 'Next surah: 2 Al-Baqara' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous surah: 1 Al-Faatiha' }));
    expect(g().reader).toEqual({ surah: 1, verse: 1 });
    await screen.findByText('Fixture translation of 1:1');
    expect(document.querySelector('[aria-current]')).toBeNull();
    act(() => g().setReader({ surah: 1, verse: 2 }));
    expect(document.querySelector('[aria-current]')).toHaveAttribute('data-verse', '1:2');
    act(() => g().setReader({ surah: 1, verse: 1 }));
    expect(document.querySelector('[aria-current]')).toHaveAttribute('data-verse', '1:1');
  });

  it('has a bookmark star on each verse row', async () => {
    g().setReader({ surah: 1, verse: 1 });
    render(<SurahReader />);
    await screen.findByText('Fixture translation of 1:1');
    const star = screen.getByRole('button', { name: 'Bookmark verse 1:2' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
  });
});
