import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useHashSync } from './useHashSync';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

const rhm = '#/root/' + encodeURIComponent('رحم');

describe('useHashSync', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    window.history.replaceState(null, '', '/');
  });
  // Unmount earlier hooks: still mounted, they would rewrite the hash on the next store change.
  afterEach(cleanup);

  it('selects the deep-linked root once the galaxy is ready', () => {
    window.history.replaceState(null, '', '/' + rhm);
    renderHook(() => useHashSync());
    expect(useGalaxyStore.getState().selectedId).toBeNull();
    expect(window.location.hash).toBe(rhm); // Not cleared while loading.
    act(() => useGalaxyStore.getState().setGalaxy(fixtureGalaxy));
    expect(useGalaxyStore.getState().selectedId).toBe(2);
  });

  it('writes the selection into the hash and clears it', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().select(2));
    expect(window.location.hash).toBe(rhm);
    act(() => useGalaxyStore.getState().select(null));
    expect(window.location.hash).toBe('');
  });

  it('reads and writes the Mushaf layout in the hash', () => {
    window.history.replaceState(null, '', '/#/mushaf' + rhm.slice(1));
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    expect(useGalaxyStore.getState().layout).toBe('mushaf');
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    act(() => useGalaxyStore.getState().setLayout('galaxy'));
    expect(window.location.hash).toBe(rhm);
    act(() => useGalaxyStore.getState().setLayout('mushaf'));
    expect(window.location.hash).toBe('#/mushaf' + rhm.slice(1));
  });

  it('follows back/forward navigation', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => {
      window.history.replaceState(null, '', '/#/root/' + encodeURIComponent('حمد'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState().selectedId).toBe(3);
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState().selectedId).toBeNull();
  });
});
