import { describe, expect, it } from 'vitest';
import { apiUrl, createClient, type HttpGet } from './wiki-client';

/** Fake HTTP: answers from a list of canned responses and records the URLs. */
function fake(responses: { status: number; body: unknown }[]) {
  const urls: string[] = [];
  const get: HttpGet = async (url) => {
    urls.push(url);
    const r = responses.shift();
    if (!r) throw new Error('no more responses');
    return { status: r.status, text: JSON.stringify(r.body), retryAfter: null };
  };
  return { get, urls };
}

const noSleep = async () => {};

describe('apiUrl', () => {
  it('adds the JSON format and maxlag parameters', () => {
    const url = new URL(apiUrl({ action: 'query', titles: 'a|b' }));
    expect(url.origin + url.pathname).toBe('https://en.wiktionary.org/w/api.php');
    expect(url.searchParams.get('maxlag')).toBe('5');
    expect(url.searchParams.get('formatversion')).toBe('2');
    expect(url.searchParams.get('titles')).toBe('a|b');
  });
});

describe('createClient', () => {
  it('fetches page wikitext, follows normalized titles and marks missing pages', async () => {
    const { get } = fake([
      {
        status: 200,
        body: {
          query: {
            normalized: [{ from: 'a_b', to: 'a b' }],
            pages: [
              { title: 'a b', revisions: [{ slots: { main: { content: 'text' } } }] },
              { title: 'c', missing: true },
            ],
          },
        },
      },
    ]);
    const client = createClient(get, noSleep);
    expect(await client.pages(['a_b', 'c'])).toEqual({ a_b: 'text', c: null });
  });

  it('sends at most 50 titles per request', async () => {
    const titles = Array.from({ length: 60 }, (_, i) => `t${i}`);
    const page = (t: string) => ({ title: t, missing: true });
    const { get, urls } = fake([
      { status: 200, body: { query: { pages: titles.slice(0, 50).map(page) } } },
      { status: 200, body: { query: { pages: titles.slice(50).map(page) } } },
    ]);
    const result = await createClient(get, noSleep).pages(titles);
    expect(urls).toHaveLength(2);
    expect(Object.keys(result)).toHaveLength(60);
  });

  it('follows continuation when a batch is too large for one response', async () => {
    const { get, urls } = fake([
      {
        status: 200,
        body: {
          continue: { rvcontinue: 'x', continue: '||' },
          query: { pages: [{ title: 'a', revisions: [{ slots: { main: { content: 'A' } } }] }, { title: 'b' }] },
        },
      },
      { status: 200, body: { query: { pages: [{ title: 'b', revisions: [{ slots: { main: { content: 'B' } } }] }] } } },
    ]);
    expect(await createClient(get, noSleep).pages(['a', 'b'])).toEqual({ a: 'A', b: 'B' });
    expect(new URL(urls[1]!).searchParams.get('rvcontinue')).toBe('x');
  });

  it('lists category members across continuation', async () => {
    const { get } = fake([
      { status: 200, body: { continue: { cmcontinue: 'n' }, query: { categorymembers: [{ title: 'يوم' }] } } },
      { status: 200, body: { query: { categorymembers: [{ title: 'ياوم' }] } } },
    ]);
    expect(await createClient(get, noSleep).category('Category:X')).toEqual(['يوم', 'ياوم']);
  });

  it('retries on 429, 5xx and maxlag errors', async () => {
    const { get, urls } = fake([
      { status: 429, body: {} },
      { status: 503, body: {} },
      { status: 200, body: { error: { code: 'maxlag' } } },
      { status: 200, body: { query: { categorymembers: [] } } },
    ]);
    expect(await createClient(get, noSleep).category('Category:X')).toEqual([]);
    expect(urls).toHaveLength(4);
  });

  it('gives up after repeated failures', async () => {
    const { get } = fake(Array.from({ length: 10 }, () => ({ status: 500, body: {} })));
    await expect(createClient(get, noSleep, { retries: 2 }).category('Category:X')).rejects.toThrow(/500/);
  });
});
