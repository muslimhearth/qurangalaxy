import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TabBar } from './TabBar';
import { resetTabs, useTabsStore } from './store';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

const tabs = () => useTabsStore.getState();

describe('TabBar', () => {
  beforeEach(() => {
    resetTabs();
    useGalaxyStore.setState({ ...useGalaxyStore.getInitialState(), galaxy: fixtureGalaxy });
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('stays hidden while the only tab is empty (nothing to keep)', () => {
    render(<TabBar />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('shows a single tab with content, so + is reachable', () => {
    tabs().update({ selectedId: 2 });
    render(<TabBar />);
    expect(screen.getByRole('tab', { name: 'رحم' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'New tab' })).toBeInTheDocument();
  });

  it('labels tabs by root, verse, search text or "New tab"', () => {
    tabs().update({ selectedId: 0 });
    tabs().open({ openVerse: '2:255' });
    tabs().open({ query: 'light' });
    tabs().open({});
    render(<TabBar />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['سمو', '2:255', '“light”', 'New tab']);
  });

  it('labels a reader tab with the surah name and verse, in Latin script', () => {
    tabs().update({ selectedId: 2, reader: { surah: 2, verse: 17 } });
    render(<TabBar />);
    const tab = screen.getByRole('tab', { name: 'Al-Baqara 2:17' });
    expect(tab.querySelector('span')).not.toHaveAttribute('lang');
    // A long label can be cut off in the pill: the tooltip has all of it.
    expect(tab).toHaveAttribute('title', 'Al-Baqara 2:17');
  });

  it('switches tabs on click', () => {
    tabs().update({ selectedId: 0 });
    tabs().open({ selectedId: 1 });
    render(<TabBar />);
    fireEvent.click(screen.getByRole('tab', { name: 'سمو' }));
    expect(screen.getByRole('tab', { name: 'سمو' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'أله' })).toHaveAttribute('aria-selected', 'false');
  });

  it('closes a tab with ×, by middle-click, or with Delete', () => {
    tabs().update({ selectedId: 0 });
    tabs().open({ selectedId: 1 });
    tabs().open({ selectedId: 2 });
    render(<TabBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Close tab سمو' }));
    expect(screen.queryByRole('tab', { name: 'سمو' })).toBeNull();
    fireEvent(screen.getByRole('tab', { name: 'أله' }), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    const last = screen.getByRole('tab', { name: 'رحم' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Delete' });
    // The last tab is replaced by an empty one, so the bar hides.
    expect(tabs().tabs).toHaveLength(1);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('+ opens an empty tab and focuses the search field', () => {
    tabs().update({ selectedId: 0 });
    render(
      <>
        <input id="root-search" />
        <TabBar />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'New tab' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'New tab' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(document.getElementById('root-search'));
  });

  it('arrow keys, Home and End move focus between tabs; only the active tab is in the Tab order', () => {
    tabs().update({ selectedId: 0 });
    tabs().open({ selectedId: 1 });
    tabs().open({ selectedId: 2 });
    render(<TabBar />);
    const [a, b, c] = screen.getAllByRole('tab');
    expect([a, b, c].map((t) => t!.tabIndex)).toEqual([-1, -1, 0]);
    c!.focus();
    fireEvent.keyDown(c!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c!, { key: 'Home' });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a!, { key: 'End' });
    expect(document.activeElement).toBe(c);
    // Ctrl+number stays with the browser.
    const ev = new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true, cancelable: true });
    c!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('follows the store when tabs change elsewhere', () => {
    tabs().update({ selectedId: 0 });
    render(<TabBar />);
    act(() => void tabs().open({ selectedId: 3 }, false));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
