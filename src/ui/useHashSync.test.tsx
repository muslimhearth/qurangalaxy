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

  it('opens the deep-linked verse once the galaxy is ready', () => {
    window.history.replaceState(null, '', '/#/verse/3:109');
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().setGalaxy(fixtureGalaxy));
    expect(useGalaxyStore.getState().openVerse).toBe('3:109');
    expect(window.location.hash).toBe('#/verse/3:109');
  });

  it('writes the open verse into the hash, and the root again when it closes', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().select(2));
    act(() => useGalaxyStore.getState().setOpenVerse('1:2'));
    expect(window.location.hash).toBe('#/verse/1:2');
    act(() => useGalaxyStore.getState().setOpenVerse(null));
    expect(window.location.hash).toBe(rhm);
  });

  it('follows back/forward between verses and roots', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => {
      window.history.replaceState(null, '', '/#/verse/2:255');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState().openVerse).toBe('2:255');
    act(() => {
      window.history.replaceState(null, '', '/' + rhm);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState()).toMatchObject({ openVerse: null, selectedId: 2 });
  });
});
