import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { fixtureGalaxy } from '../data/fixture';
import { useGalaxyStore } from '../state/store';
import { resetTabs, useTabsStore } from '../tabs/store';
import { LONG_PRESS_MS } from '../tabs/useNewTabGesture';
import { BookmarksButton } from './BookmarksButton';
import { resetBookmarks, useBookmarks } from './store';

const openList = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Bookmarks/ }));
  return screen.getByRole('dialog', { name: 'Bookmarks' });
};
const rows = (dialog: HTMLElement) => within(dialog).getAllByRole('listitem');

describe('BookmarksButton', () => {
  beforeEach(() => {
    // Fixture mode: verses come from the in-memory fixture.
    window.history.replaceState(null, '', '/?fixture');
    localStorage.clear();
    resetBookmarks();
    resetTabs();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    useBookmarks.getState().toggle({ root: 2 });
    useBookmarks.getState().toggle({ verse: '1:2' });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('lists verses and roots, newest first: verse key with a snippet, root Arabic with its meaning', async () => {
    render(<BookmarksButton />);
    const dialog = openList();
    expect(rows(dialog)).toHaveLength(2);
    expect(rows(dialog)[1]).toHaveTextContent('رحم');
    expect(rows(dialog)[1]).toHaveTextContent(fixtureGalaxy.roots[2]!.en[0]!);
    expect(await within(rows(dialog)[0]!).findByText(/Fixture translation of 1:2/)).toBeInTheDocument();
  });

  it('says how to add bookmarks when there are none', () => {
    useBookmarks.setState({ list: [] });
    render(<BookmarksButton />);
    expect(openList()).toHaveTextContent('No bookmarks yet');
  });

  it('a tap opens the root in the current tab and closes the list', () => {
    useGalaxyStore.setState({ openVerse: '1:1', query: 'x' });
    render(<BookmarksButton />);
    openList();
    fireEvent.click(screen.getByRole('button', { name: 'Open رحم' }));
    expect(useGalaxyStore.getState()).toMatchObject({ selectedId: 2, openVerse: null, query: '' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a tap on a verse opens the verse panel', () => {
    render(<BookmarksButton />);
    openList();
    fireEvent.click(screen.getByRole('button', { name: 'Open verse 1:2' }));
    expect(useGalaxyStore.getState().openVerse).toBe('1:2');
  });

  it('middle-click opens a background tab and keeps the list open', () => {
    render(<BookmarksButton />);
    openList();
    fireEvent(screen.getByRole('button', { name: 'Open verse 1:2' }), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(useTabsStore.getState().tabs.map((t) => t.openVerse)).toEqual([null, '1:2']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a long-press opens a new tab, switches to it and closes the list', () => {
    vi.useFakeTimers();
    render(<BookmarksButton />);
    openList();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open رحم' }), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    const t = useTabsStore.getState();
    expect(t.tabs.find((x) => x.id === t.activeId)!.selectedId).toBe(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('removes a bookmark from the list', () => {
    render(<BookmarksButton />);
    const dialog = openList();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove bookmark رحم' }));
    expect(rows(dialog)).toHaveLength(1);
    expect(useBookmarks.getState().has({ root: 2 })).toBe(false);
  });

  it('closes with Escape and with a press outside', () => {
    render(
      <>
        <BookmarksButton />
        <p>outside</p>
      </>,
    );
    openList();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Open رحم' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    openList();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
