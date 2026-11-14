import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { fixtureGalaxy } from '../data/fixture';
import { useGalaxyStore } from '../state/store';
import { resetTranslit } from '../verses/translit';
import { VersePanel } from './VersePanel';
import { resetTabs, useTabsStore } from '../tabs/store';
import { resetBookmarks, useBookmarks } from '../bookmarks/store';

describe('VersePanel', () => {
  beforeEach(() => {
    // Fixture mode: verses and occurrences come from the in-memory fixture.
    window.history.replaceState(null, '', '/?fixture');
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(() => {
    cleanup();
    resetTranslit();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('shows nothing without an open verse', () => {
    const { container } = render(<VersePanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the verse and its roots in word order', async () => {
    useGalaxyStore.getState().setOpenVerse('1:2');
    render(<VersePanel />);
    expect(screen.getByRole('heading', { name: '1:2' })).toBeInTheDocument();
    expect(await screen.findByText('Fixture translation of 1:2')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Roots in this verse' });
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(
      [3, 1, 4, 5].map((id) => fixtureGalaxy.roots[id]!.ar + (fixtureGalaxy.roots[id]!.en[0] ?? '')),
    );
  });

  it('a root chip closes the verse, clears the search and selects the root', async () => {
    useGalaxyStore.setState({ openVerse: '1:2', query: 'praise' });
    render(<VersePanel />);
    const list = await screen.findByRole('list', { name: 'Roots in this verse' });
    fireEvent.click(within(list).getAllByRole('button')[0]!);
    expect(useGalaxyStore.getState()).toMatchObject({ openVerse: null, query: '', selectedId: 3 });
  });

  it('a root chip opens in a background tab on Ctrl-click; the verse stays', async () => {
    resetTabs();
    useGalaxyStore.setState({ openVerse: '1:2' });
    render(<VersePanel />);
    const list = await screen.findByRole('list', { name: 'Roots in this verse' });
    fireEvent.click(within(list).getAllByRole('button')[0]!, { ctrlKey: true });
    expect(useTabsStore.getState().tabs.map((t) => t.selectedId)).toEqual([null, 3]);
    expect(useGalaxyStore.getState().openVerse).toBe('1:2');
  });

  it('bookmarks the verse from the header', () => {
    localStorage.clear();
    resetBookmarks();
    useGalaxyStore.getState().setOpenVerse('1:2');
    render(<VersePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark verse 1:2' }));
    expect(useBookmarks.getState().has({ verse: '1:2' })).toBe(true);
  });

  it('closes with the close button and with Escape', () => {
    useGalaxyStore.getState().setOpenVerse('1:1');
    render(<VersePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Close verse details' }));
    expect(useGalaxyStore.getState().openVerse).toBeNull();
    act(() => useGalaxyStore.getState().setOpenVerse('1:1'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGalaxyStore.getState().openVerse).toBeNull();
  });

  it('the verse key opens the surah reader at that verse', () => {
    useGalaxyStore.getState().setOpenVerse('1:2');
    render(<VersePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Read 1:2 in its surah' }));
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 1, verse: 2 });
  });

  it('hides the English text with the "Show meanings" toggle', async () => {
    useGalaxyStore.getState().setOpenVerse('1:2');
    render(<VersePanel />);
    expect(await screen.findByText('Fixture translation of 1:2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show meanings' }));
    expect(screen.queryByText('Fixture translation of 1:2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show meanings' }));
  });

  it('stays mounted but hidden under the reader, and leaves Escape to it', () => {
    useGalaxyStore.getState().setOpenVerse('1:1');
    const { container } = render(<VersePanel hidden />);
    expect(container.querySelector('aside')).toHaveAttribute('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGalaxyStore.getState().openVerse).toBe('1:1');
  });

  it('shows the transliteration with its markup as styles', async () => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('translit')
              ? { '1:1': 'Bismi All<u>a</U>hi' }
              : url.includes('verses')
                ? { '1:1': { ar: 'x', en: 'In the name' } }
                : [],
          ),
        ),
      ),
    );
    useGalaxyStore.getState().setOpenVerse('1:1');
    render(<VersePanel />);
    const tr = await screen.findByText((_, el) => el?.className === 'verse-tr');
    expect(tr).toHaveTextContent('Bismi Allahi');
    expect(tr.querySelector('.tr-u')).toHaveTextContent('a');
  });
});
