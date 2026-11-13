import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { useGalaxyStore } from '../state/store';
import { NO_INSET } from './inset';
import { usePanelInset } from './usePanelInset';

/** Adds a fake root panel at the given rectangle. */
function addPanel(left: number, top: number) {
  const el = document.createElement('aside');
  el.className = 'root-panel';
  el.getBoundingClientRect = () => ({ left, top, right: 1024, bottom: 768 }) as DOMRect;
  document.body.append(el);
  return el;
}

describe('usePanelInset', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('is empty with no selection', () => {
    const { result } = renderHook(() => usePanelInset());
    expect(result.current).toEqual(NO_INSET);
  });

  it('measures the panel after a root is selected and resets on close', async () => {
    const { result } = renderHook(() => usePanelInset());
    addPanel(624, 16);
    act(() => useGalaxyStore.getState().select(2));
    await vi.waitFor(() => expect(result.current).toEqual({ right: 400, bottom: 0, top: 0 }));
    act(() => useGalaxyStore.getState().select(null));
    expect(result.current).toEqual(NO_INSET);
  });

  it('adds the search bar as a top inset while a root is selected', async () => {
    const { result } = renderHook(() => usePanelInset());
    addPanel(624, 16);
    const bar = document.createElement('div');
    bar.className = 'search-row';
    bar.getBoundingClientRect = () => ({ left: 300, top: 16, right: 700, bottom: 60 }) as DOMRect;
    document.body.append(bar);
    act(() => useGalaxyStore.getState().select(2));
    await vi.waitFor(() => expect(result.current).toEqual({ right: 400, bottom: 0, top: 60 }));
  });
});
