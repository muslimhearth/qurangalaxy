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

  it('opens the deep-linked surah reader once the galaxy is ready', () => {
    window.history.replaceState(null, '', '/#/surah/2/17');
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().setGalaxy(fixtureGalaxy));
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 2, verse: 17 });
    expect(window.location.hash).toBe('#/surah/2/17');
  });

  it('writes the reader into the hash over the root, and the root again when it closes', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().select(2));
    act(() => useGalaxyStore.getState().setReader({ surah: 1, verse: 3 }));
    expect(window.location.hash).toBe('#/surah/1/3');
    act(() => useGalaxyStore.getState().setReader({ surah: 2, verse: 1 }));
    expect(window.location.hash).toBe('#/surah/2/1');
    act(() => useGalaxyStore.getState().setReader(null));
    expect(window.location.hash).toBe(rhm);
  });

  it('back/forward opens and closes the reader and keeps the root under it', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    renderHook(() => useHashSync());
    act(() => useGalaxyStore.getState().select(2));
    act(() => {
      window.history.replaceState(null, '', '/#/surah/2/17');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState()).toMatchObject({ reader: { surah: 2, verse: 17 }, selectedId: 2 });
    act(() => {
      window.history.replaceState(null, '', '/' + rhm);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(useGalaxyStore.getState()).toMatchObject({ reader: null, selectedId: 2 });
  });
});
