import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { TAB_STRIP_QUERY, useTabLayout } from './layout';

/** A fake media query list whose match can change. */
function fakeMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    media: TAB_STRIP_QUERY,
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    set(m: boolean) {
      mql.matches = m;
      listeners.forEach((f) => f());
    },
  };
}

describe('useTabLayout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a fine pointer and at least 1024 px', () => {
    expect(TAB_STRIP_QUERY).toBe('(min-width: 1024px) and (pointer: fine)');
  });

  it('shows the strip on wide screens with a mouse, else the counter', () => {
    const media = fakeMedia(true);
    const { result } = renderHook(() => useTabLayout());
    expect(result.current).toBe('strip');
    act(() => media.set(false));
    expect(result.current).toBe('counter');
  });

  it('falls back to the strip without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useTabLayout());
    expect(result.current).toBe('strip');
  });
});
