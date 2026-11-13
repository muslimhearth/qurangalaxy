import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLoadCache } from '../data/load';
import { fixtureOccurrences } from '../data/fixture';
import type { EmbeddingsMeta } from '../data/types';
import { loadSemanticIndex, resetSemanticIndex } from './loadIndex';

const meta: EmbeddingsMeta = { model: 'm', dims: 2, encoding: 'int8', scale: 100, keys: ['1:1', '1:2'] };
const bin = new Int8Array([100, 0, 0, 100]);

function respond(url: string): Response {
  const base = import.meta.env.BASE_URL;
  if (url === `${base}data/embeddings.json`) return { ok: true, json: async () => meta } as Response;
  if (url === `${base}data/embeddings.bin`) return { ok: true, arrayBuffer: async () => bin.buffer } as Response;
  if (url === `${base}data/occurrences.json`) return { ok: true, json: async () => fixtureOccurrences } as Response;
  return { ok: false, status: 404, statusText: 'Not Found' } as Response;
}

describe('loadSemanticIndex', () => {
  beforeEach(() => {
    resetLoadCache();
    resetSemanticIndex();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the matrix, its meta and the occurrences once', async () => {
    const fetchMock = vi.fn(async (url: string) => respond(url));
    vi.stubGlobal('fetch', fetchMock);
    const index = await loadSemanticIndex();
    await loadSemanticIndex();
    expect(index.meta).toEqual(meta);
    expect([...index.matrix]).toEqual([100, 0, 0, 100]);
    expect(index.verseRoots.get('1:1')).toEqual([0, 1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails clearly and retries later', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }) as Response));
    await expect(loadSemanticIndex()).rejects.toThrow(/Could not load .*404/);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => respond(url)));
    await expect(loadSemanticIndex()).resolves.toBeDefined();
  });
});
