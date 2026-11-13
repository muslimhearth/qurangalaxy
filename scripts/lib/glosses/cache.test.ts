import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { emptyCache, fillCache, loadCache, saveCache } from './cache';
import type { WikiClient } from './wiki-client';

function fakeClient(pages: Record<string, string>) {
  const asked: string[][] = [];
  const client: WikiClient = {
    async pages(titles) {
      asked.push(titles);
      return Object.fromEntries(titles.map((t) => [t, pages[t] ?? null]));
    },
    async category() {
      return [];
    },
  };
  return { client, asked };
}

const roots = [{ ar: 'نور', lemmas: [{ ar: 'نُور' }, { ar: 'نار' }] }];

describe('fillCache', () => {
  it('fetches appendix pages and lemma pages, recording missing ones as null', async () => {
    const { client } = fakeClient({ 'Appendix:Arabic roots/ن و ر': 'root text', نور: 'noor' });
    const cache = emptyCache();
    await fillCache(cache, roots, client);
    expect(cache.appendix).toEqual({ نور: 'root text' });
    expect(cache.pages).toEqual({ نور: 'noor', نار: null });
  });

  it('fetches nothing that is already cached, and extra titles on request', async () => {
    const { client, asked } = fakeClient({ منارة: 'm' });
    const cache = { appendix: { نور: null }, pages: { نور: 'x', نار: null } };
    await fillCache(cache, roots, client, { extraTitles: () => ['منارة', 'نور'] });
    expect(asked).toEqual([['منارة']]);
    expect(cache.pages['منارة']).toBe('m');
  });
});

describe('loadCache and saveCache', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('round-trips through files and starts empty when none exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'wikt-'));
    expect(loadCache(join(dir, 'none'))).toEqual(emptyCache());
    const cache = { appendix: { a: null }, pages: { b: 'text' } };
    saveCache(dir, cache);
    expect(loadCache(dir)).toEqual(cache);
  });
});
