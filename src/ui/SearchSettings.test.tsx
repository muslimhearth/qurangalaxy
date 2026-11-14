import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchSettings } from './SearchSettings';
import { useGalaxyStore } from '../state/store';
import { HISTORY_KEY, useSearchHistory } from '../history/history';
import { MEANINGS_KEY, useMeanings } from './meanings';
import { THEME_KEY, useTheme } from '../theme/theme';

describe('SearchSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useSearchHistory.setState({ saving: true, entries: [] });
    useMeanings.setState({ show: true });
    useTheme.setState({ pref: 'system' });
  });
  afterEach(cleanup);

  const button = () => screen.getByRole('button', { name: /search settings/i });
  const dialog = () => screen.queryByRole('dialog', { name: 'Search settings' });

  it('is a gear button that names the current mode and keeps the popover closed', () => {
    render(<SearchSettings status="off" progress={0} />);
    expect(button()).toHaveAccessibleName('Search settings: Exact');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(dialog()).toBeNull();
  });

  it('opens the popover, switches the mode, and closes with Escape', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    fireEvent.click(screen.getByRole('radio', { name: 'Meaning' }));
    expect(useGalaxyStore.getState().semanticWeight).toBe(1);
    expect(button()).toHaveAccessibleName('Search settings: Meaning');
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Meaning' }), { key: 'Escape' });
    expect(dialog()).toBeNull();
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps Escape from also closing the root panel', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    let reachedWindow = false;
    const onKey = () => (reachedWindow = true);
    window.addEventListener('keydown', onKey);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Exact' }), { key: 'Escape' });
    window.removeEventListener('keydown', onKey);
    expect(reachedWindow).toBe(false);
  });

  it('closes when clicking outside', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    fireEvent.pointerDown(document.body);
    expect(dialog()).toBeNull();
  });

  it('closes when focus moves outside, e.g. back to the search field', () => {
    render(
      <>
        <input aria-label="field" />
        <SearchSettings status="off" progress={0} />
      </>,
    );
    fireEvent.click(button());
    fireEvent.focusIn(screen.getByLabelText('field'));
    expect(dialog()).toBeNull();
  });

  it('shows model download progress on the button while the popover is closed', () => {
    useGalaxyStore.getState().setSemanticWeight(1);
    render(<SearchSettings status="loading" progress={0.42} />);
    const ring = screen.getByRole('progressbar', { name: /loading meaning model/i });
    expect(button()).toContainElement(ring);
    expect(ring).toHaveAttribute('aria-valuenow', '42');
  });

  it('shows a given mix instead of the root search mix', () => {
    let seen = -1;
    render(<SearchSettings status="off" progress={0} weight={0.5} onWeight={(w) => (seen = w)} />);
    expect(button()).toHaveAccessibleName('Search settings: Hybrid');
    fireEvent.click(button());
    fireEvent.click(screen.getByRole('radio', { name: 'Exact' }));
    expect(seen).toBe(0);
  });

  it('turns search history saving off and on', () => {
    useSearchHistory.setState({ entries: [{ query: 'light', mode: 'roots' }] });
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    const toggle = screen.getByRole('switch', { name: 'Save search history' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(useSearchHistory.getState()).toMatchObject({ saving: false, entries: [] });
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    fireEvent.click(toggle);
    expect(useSearchHistory.getState().saving).toBe(true);
  });

  it('clears the history with a link, only when there is history', () => {
    useSearchHistory.setState({
      entries: [
        { query: 'light', mode: 'roots' },
        { query: 'mercy', mode: 'verses' },
      ],
    });
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    expect(screen.getByText('2 recent searches')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(useSearchHistory.getState()).toMatchObject({ saving: true, entries: [] });
    expect(screen.queryByRole('button', { name: 'Clear history' })).toBeNull();
  });

  it('turns "Show meanings" off and on', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    const toggle = screen.getByRole('switch', { name: 'Show meanings' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(useMeanings.getState().show).toBe(false);
    expect(localStorage.getItem(MEANINGS_KEY)).toBe('false');
    fireEvent.click(toggle);
    expect(useMeanings.getState().show).toBe(true);
  });

  it('has a "System | Light | Dark" theme switch, System by default', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(useTheme.getState().pref).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'false');
  });
});
