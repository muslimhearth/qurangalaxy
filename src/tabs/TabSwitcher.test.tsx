import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TabSwitcher } from './TabSwitcher';
import { resetTabs, useTabsStore } from './store';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

const tabs = () => useTabsStore.getState();

describe('TabSwitcher', () => {
  beforeEach(() => {
    resetTabs();
    useGalaxyStore.setState({ ...useGalaxyStore.getInitialState(), galaxy: fixtureGalaxy });
    tabs().update({ selectedId: 2 });
    tabs().open({ reader: { surah: 2, verse: 17 } });
    tabs().open({ openVerse: '2:255' });
    tabs().open({ query: 'light' });
    tabs().activate(tabs().tabs[1]!.id);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('lists every tab with its label and caption, and marks the active one', () => {
    render(<TabSwitcher variant="sheet" onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Tabs' });
    expect(within(dialog).getByRole('heading')).toHaveTextContent('4 tabs');
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.map((r) => r.querySelector('.tab-row-caption')!.textContent)).toEqual([
      'Root · r-ḥ-m · mercy',
      'Reader · surah 2, verse 17',
      'Verse · 2:255',
      'Search · Roots',
    ]);
    const active = within(dialog).getByRole('button', { name: 'Al-Baqara 2:17' });
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).toHaveClass('on');
    // The active row has the focus, so the keyboard starts there.
    expect(document.activeElement).toBe(active);
  });

  it('switches to a picked tab and closes', () => {
    const onClose = vi.fn();
    render(<TabSwitcher variant="sheet" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'رحم' }));
    expect(tabs().activeId).toBe(tabs().tabs[0]!.id);
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('closes a tab with its × and stays open', () => {
    const onClose = vi.fn();
    render(<TabSwitcher variant="sheet" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close tab 2:255' }));
    expect(tabs().tabs).toHaveLength(3);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('+ New tab opens an empty tab, focuses the search field and closes', () => {
    const onClose = vi.fn();
    render(
      <>
        <input id="root-search" />
        <TabSwitcher variant="sheet" onClose={onClose} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'New tab' }));
    expect(tabs().tabs).toHaveLength(5);
    expect(onClose).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(document.getElementById('root-search'));
  });

  it('closes with Escape, the × button or the scrim', () => {
    const onClose = vi.fn();
    render(<TabSwitcher variant="sheet" onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close tab list' }));
    fireEvent.pointerDown(document.querySelector('.tab-scrim')!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('keeps the Tab key inside the sheet', () => {
    render(<TabSwitcher variant="sheet" onClose={() => {}} />);
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button');
    buttons.at(-1)!.focus();
    fireEvent.keyDown(buttons.at(-1)!, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('as a popover: no scrim, closes on a press outside', () => {
    const onClose = vi.fn();
    render(<TabSwitcher variant="popover" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'All tabs' })).toBeInTheDocument();
    expect(document.querySelector('.tab-scrim')).toBeNull();
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
