import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TabCounter } from './TabCounter';
import { resetTabs, useTabsStore } from './store';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

const tabs = () => useTabsStore.getState();
/** Phone or narrow window: the strip query does not match. */
const counterLayout = (matches = false) => vi.stubGlobal('matchMedia', () => ({ matches, addEventListener() {}, removeEventListener() {} }));

describe('TabCounter', () => {
  beforeEach(() => {
    resetTabs();
    counterLayout();
    useGalaxyStore.setState({ ...useGalaxyStore.getInitialState(), galaxy: fixtureGalaxy });
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stays hidden while the only tab is empty', () => {
    render(<TabCounter />);
    expect(screen.queryByRole('button', { name: /Tabs/ })).toBeNull();
  });

  it('shows the number of tabs once there is something to keep', () => {
    tabs().update({ selectedId: 2 });
    const { rerender } = render(<TabCounter />);
    expect(screen.getByRole('button', { name: 'Tabs (1)' })).toHaveTextContent('1');
    act(() => void tabs().open({ selectedId: 0 }));
    rerender(<TabCounter />);
    expect(screen.getByRole('button', { name: 'Tabs (2)' })).toHaveTextContent('2');
  });

  it('is not shown where the pill strip shows', () => {
    counterLayout(true);
    tabs().update({ selectedId: 2 });
    render(<TabCounter />);
    expect(screen.queryByRole('button', { name: /Tabs/ })).toBeNull();
  });

  it('opens the switcher sheet and closes it with Escape, focus back on the counter', () => {
    tabs().update({ selectedId: 2 });
    render(<TabCounter />);
    const button = screen.getByRole('button', { name: 'Tabs (1)' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Tabs' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('pulses when a tab is added (e.g. by a long-press)', () => {
    tabs().update({ selectedId: 2 });
    render(<TabCounter />);
    expect(document.querySelector('.tab-counter .pulse')).toBeNull();
    act(() => void tabs().open({ selectedId: 0 }));
    expect(document.querySelector('.tab-counter .pulse')).toHaveTextContent('2');
  });

  it('does not pulse when a tab closes', () => {
    tabs().update({ selectedId: 2 });
    tabs().open({ selectedId: 0 });
    render(<TabCounter />);
    act(() => tabs().close(tabs().activeId));
    expect(document.querySelector('.tab-counter .pulse')).toBeNull();
  });
});
