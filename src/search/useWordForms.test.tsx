import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fixtureOccurrences, fixtureVerses } from '../data/fixture';
import { useWordForms } from './useWordForms';
import { buildWordForms } from './wordForms';
import { currentWordForms, setWordForms } from './wordFormsLoad';

describe('useWordForms', () => {
  beforeEach(() => {
    setWordForms(null);
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not fetch while disabled', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useWordForms(false));
    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads wordforms.json once enabled and shares it with the matcher', async () => {
    const file = buildWordForms(fixtureVerses, fixtureOccurrences);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => file }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(({ on }) => useWordForms(on), { initialProps: { on: false } });
    rerender({ on: true });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current!.forms).toEqual(file.forms);
    expect(currentWordForms()).toBe(result.current);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/data\/wordforms\.json$/);
  });

  it('stays null when the load fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' })));
    const { result } = renderHook(() => useWordForms(true));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toBeNull();
  });
});
