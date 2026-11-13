import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRootDetails } from './useRootDetails';
import { resetLoadCache } from '../data/load';
import { fixtureOccurrences, fixtureVerses } from '../data/fixture';

describe('useRootDetails', () => {
  beforeEach(() => {
    resetLoadCache();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stays idle and does not fetch without a root', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useRootDetails(null));
    expect(result.current.status).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads occurrences and verses for the root', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => (url.endsWith('occurrences.json') ? fixtureOccurrences : fixtureVerses),
      })),
    );
    const { result, rerender } = renderHook(({ id }) => useRootDetails(id), { initialProps: { id: 2 as number | null } });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.occurrences).toEqual(fixtureOccurrences[2]);
    expect(result.current.verses).toEqual(fixtureVerses);
    rerender({ id: 3 });
    await waitFor(() => expect(result.current.occurrences).toEqual(fixtureOccurrences[3]));
  });

  it('reports an error when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, statusText: 'Error' })));
    const { result } = renderHook(() => useRootDetails(1));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/HTTP 500/);
  });
});
