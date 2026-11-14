import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTranslit, plainTranslit, resetTranslit, translitSegments } from './translit';

describe('translitSegments', () => {
  it('splits Tanzil markup into styled pieces, tags in any case', () => {
    expect(translitSegments('All<u>a</U>hu a<b>l</B>rra<i><u>th</u></i>x')).toEqual([
      { text: 'All', marks: [] },
      { text: 'a', marks: ['u'] },
      { text: 'hu a', marks: [] },
      { text: 'l', marks: ['b'] },
      { text: 'rra', marks: [] },
      { text: 'th', marks: ['i', 'u'] },
      { text: 'x', marks: [] },
    ]);
  });

  it('keeps <strong> and drops unknown tags', () => {
    expect(translitSegments('bi<strong>A</strong>ll<x>a</x>')).toEqual([
      { text: 'bi', marks: [] },
      { text: 'A', marks: ['strong'] },
      { text: 'lla', marks: [] },
    ]);
  });
});

describe('plainTranslit', () => {
  it('removes the markup', () => {
    expect(plainTranslit('Bismi All<u>a</U>hi a<b>l</B>rra<u>h</U>m<u>a</U>ni')).toBe('Bismi Allahi alrrahmani');
  });
});

describe('loadTranslit', () => {
  afterEach(() => {
    resetTranslit();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('fetches translit.json once', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ '1:1': 'Bismi' })));
    vi.stubGlobal('fetch', fetch);
    expect(await loadTranslit()).toEqual({ '1:1': 'Bismi' });
    await loadTranslit();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(loadTranslit()).rejects.toThrow(/translit/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
    expect(await loadTranslit()).toEqual({});
  });

  it('has no transliteration in fixture mode', async () => {
    window.history.replaceState(null, '', '/?fixture');
    expect(await loadTranslit()).toEqual({});
  });
});
