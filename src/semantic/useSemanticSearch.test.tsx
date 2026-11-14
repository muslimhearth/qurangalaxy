import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../search/types';
import type { ProgressListener } from './embedder';
import type { SemanticService } from './service';
import { DEBOUNCE_MS, useSemanticSearch, useSemanticVerses } from './useSemanticSearch';

const hit = (q: string): Match[] => [{ id: 1, score: 1, reason: { kind: 'semantic', text: q }, verses: ['1:1'] }];

function fakeService() {
  let finishWarm: () => void = () => {};
  let failWarm: (e: Error) => void = () => {};
  const service: SemanticService = {
    warm: vi.fn(
      () =>
        new Promise<void>((res, rej) => {
          finishWarm = res;
          failWarm = rej;
        }),
    ),
    search: vi.fn(async (q: string) => hit(q)),
    searchVerses: vi.fn(async (q: string) => [{ key: '1:1' as const, sim: q.length / 10 }]),
  };
  let progress: ProgressListener = () => {};
  const subscribe = (l: ProgressListener) => {
    progress = l;
    return () => {};
  };
  return { service, subscribe, finishWarm: () => finishWarm(), failWarm: (e: Error) => failWarm(e), progress: (f: number) => progress(f) };
}

describe('useSemanticSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does nothing at weight 0', () => {
    const f = fakeService();
    const { result } = renderHook(() => useSemanticSearch('patience', 0, () => f.service, f.subscribe));
    vi.advanceTimersByTime(1000);
    expect(result.current.status).toBe('off');
    expect(f.service.warm).not.toHaveBeenCalled();
    expect(f.service.search).not.toHaveBeenCalled();
  });

  it('loads the model when the weight leaves 0 and reports progress', async () => {
    const f = fakeService();
    const { result, rerender } = renderHook(({ w }) => useSemanticSearch('', w, () => f.service, f.subscribe), {
      initialProps: { w: 0 },
    });
    rerender({ w: 0.5 });
    expect(result.current.status).toBe('loading');
    act(() => f.progress(0.4));
    expect(result.current.progress).toBe(0.4);
    await act(async () => f.finishWarm());
    expect(result.current.status).toBe('ready');
  });

  it('shows an error when the model cannot load', async () => {
    const f = fakeService();
    const { result } = renderHook(() => useSemanticSearch('', 1, () => f.service, f.subscribe));
    await act(async () => f.failWarm(new Error('no model')));
    expect(result.current).toMatchObject({ status: 'error', error: 'no model' });
  });

  it('searches once after typing pauses and returns matches for the current query', async () => {
    const f = fakeService();
    const { result, rerender } = renderHook(({ q }) => useSemanticSearch(q, 1, () => f.service, f.subscribe), {
      initialProps: { q: 'pat' },
    });
    rerender({ q: 'patience' });
    expect(result.current.matches).toBeNull();
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    expect(f.service.search).toHaveBeenCalledTimes(1);
    expect(f.service.search).toHaveBeenCalledWith('patience');
    expect(result.current.matches).toEqual(hit('patience'));
  });

  it('drops matches of an older query', async () => {
    const f = fakeService();
    const { result, rerender } = renderHook(({ q }) => useSemanticSearch(q, 1, () => f.service, f.subscribe), {
      initialProps: { q: 'light' },
    });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    rerender({ q: 'sea' });
    expect(result.current.matches).toBeNull();
  });

  it('finds verses with the verse variant', async () => {
    const f = fakeService();
    const { result } = renderHook(() => useSemanticVerses('patience', 1, () => f.service, f.subscribe));
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    expect(f.service.search).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([{ key: '1:1', sim: 0.8 }]);
  });
});
