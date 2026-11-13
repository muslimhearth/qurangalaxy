import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLoadGalaxy } from './useLoadGalaxy';
import { resetLoadCache } from './load';
import { fixtureGalaxy } from './fixture';
import { useGalaxyStore } from '../state/store';
import { useLoadError } from '../ui/loadError';

describe('useLoadGalaxy', () => {
  beforeEach(() => {
    resetLoadCache();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useLoadError.setState({ error: null });
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('puts the fetched galaxy into the store', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => fixtureGalaxy }) as Response));
    renderHook(() => useLoadGalaxy());
    await waitFor(() => expect(useGalaxyStore.getState().galaxy).toEqual(fixtureGalaxy));
  });

  it('records the error when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }) as Response));
    renderHook(() => useLoadGalaxy());
    await waitFor(() => expect(useLoadError.getState().error).toMatch(/galaxy\.json/));
    expect(useGalaxyStore.getState().galaxy).toBeNull();
  });
});
