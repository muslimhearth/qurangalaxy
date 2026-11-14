import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { fixtureGalaxy } from '../data/fixture';
import { useGalaxyStore } from '../state/store';
import { BookmarkButton } from './BookmarkButton';
import { resetBookmarks, useBookmarks } from './store';

describe('BookmarkButton', () => {
  beforeEach(() => {
    localStorage.clear();
    resetBookmarks();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  it('toggles a root bookmark and shows its state', () => {
    render(<BookmarkButton target={{ root: 2 }} />);
    const button = screen.getByRole('button', { name: 'Bookmark رحم' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(useBookmarks.getState().has({ root: 2 })).toBe(true);
    fireEvent.click(button);
    expect(useBookmarks.getState().list).toEqual([]);
  });

  it('names a verse by its key', () => {
    render(<BookmarkButton target={{ verse: '1:2' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark verse 1:2' }));
    expect(useBookmarks.getState().has({ verse: '1:2' })).toBe(true);
  });
});
