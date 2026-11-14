import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isFixtureMode, loadGalaxy, loadJson, loadLemmaIndex, loadOccurrences, loadVerses, resetLoadCache } from './load';
import { fixtureGalaxy, fixtureLemmaIndex, fixtureOccurrences, fixtureVerses } from './fixture';

function okResponse(body: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response;
}

describe('data loaders', () => {
  beforeEach(() => {
    resetLoadCache();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches galaxy.json from the base URL', async () => {
    const fetchMock = vi.fn(async () => okResponse(fixtureGalaxy));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadGalaxy()).resolves.toEqual(fixtureGalaxy);
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/galaxy.json`);
  });

  it('fetches lemmas.json for the lemma filter', async () => {
    const fetchMock = vi.fn(async () => okResponse([[0]]));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadLemmaIndex()).resolves.toEqual([[0]]);
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/lemmas.json`);
  });

  it('fetches any data file once, also in fixture mode', async () => {
    window.history.replaceState(null, '', '/?fixture');
    const fetchMock = vi.fn(async () => okResponse(['V|PERF']));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadJson('morph/tags.json')).resolves.toEqual(['V|PERF']);
    await loadJson('morph/tags.json');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/morph/tags.json`);
  });

  it('fetches each file only once', async () => {
    const fetchMock = vi.fn(async () => okResponse(fixtureVerses));
    vi.stubGlobal('fetch', fetchMock);
    const a = loadVerses();
    const b = loadVerses();
    expect(a).toBe(b);
    await a;
    await loadVerses();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects with a clear error on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }) as Response));
    await expect(loadOccurrences()).rejects.toThrow(/occurrences\.json.*404/);
  });

  it('retries after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' } as Response)
      .mockResolvedValueOnce(okResponse(fixtureOccurrences));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadOccurrences()).rejects.toThrow();
    await expect(loadOccurrences()).resolves.toEqual(fixtureOccurrences);
  });

  it('uses the fixture without fetching when the URL has ?fixture', async () => {
    window.history.replaceState(null, '', '/?fixture');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(isFixtureMode()).toBe(true);
    await expect(loadGalaxy()).resolves.toBe(fixtureGalaxy);
    await expect(loadOccurrences()).resolves.toBe(fixtureOccurrences);
    await expect(loadVerses()).resolves.toBe(fixtureVerses);
    await expect(loadLemmaIndex()).resolves.toBe(fixtureLemmaIndex);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
