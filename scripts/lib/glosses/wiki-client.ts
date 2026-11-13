/**
 * Minimal, polite MediaWiki API client for English Wiktionary: serial requests,
 * maxlag, a small delay between calls and retry with backoff.
 */

/** English Wiktionary API endpoint. */
export const API = 'https://en.wiktionary.org/w/api.php';
/** Generic User-Agent: no personal or project details. */
export const USER_AGENT = 'root-gloss-builder/1.0';
/** MediaWiki limit for page content per request. */
export const BATCH = 50;

/** Result of one HTTP GET. */
export interface HttpResponse {
  status: number;
  text: string;
  /** Retry-After header in seconds, if any. */
  retryAfter: number | null;
}

/** Performs one HTTP GET. Injected so tests run without network. */
export type HttpGet = (url: string) => Promise<HttpResponse>;

/** Default HTTP GET with the generic User-Agent. */
export const fetchGet: HttpGet = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
  const ra = Number(res.headers.get('retry-after'));
  return { status: res.status, text: await res.text(), retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null };
};

/** Builds an API URL with JSON format v2 and maxlag=5. */
export function apiUrl(params: Record<string, string>): string {
  const url = new URL(API);
  const all = { format: 'json', formatversion: '2', maxlag: '5', ...params };
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, v);
  return url.toString();
}

/** Client options. The default delay keeps under the 10 requests a minute allowed to unidentified clients. */
export interface ClientOptions {
  /** Attempts after the first one. */
  retries?: number;
  /** Pause between requests in milliseconds. */
  delayMs?: number;
}

/** Wiktionary reader: page wikitext (null when missing) and category members. */
export interface WikiClient {
  pages(titles: string[]): Promise<Record<string, string | null>>;
  category(title: string): Promise<string[]>;
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Creates a client on top of an HTTP GET and a sleep function. */
export function createClient(
  get: HttpGet = fetchGet,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  { retries = 6, delayMs = 6500 }: ClientOptions = {},
): WikiClient {
  async function call(params: Record<string, string>): Promise<Json> {
    for (let attempt = 0; ; attempt++) {
      await sleep(delayMs);
      const res = await get(apiUrl(params));
      let body: Json | null = null;
      if (res.status === 200) body = JSON.parse(res.text) as Json;
      const lagged = body?.error?.code === 'maxlag';
      if (body && !lagged) {
        if (body.error) throw new Error(`API error ${body.error.code}: ${body.error.info ?? ''}`);
        return body;
      }
      const retryable = lagged || res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) throw new Error(`Request failed (${res.status}): ${JSON.stringify(params)}`);
      // Exponential backoff, at least what the server asks for.
      await sleep(Math.max((res.retryAfter ?? 0) * 1000, 1000 * 2 ** attempt));
    }
  }

  async function batch(titles: string[]): Promise<Record<string, string | null>> {
    const content = new Map<string, string | null>();
    const alias = new Map<string, string>(); // asked title -> final title
    let cont: Record<string, string> = {};
    do {
      const body = await call({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        redirects: '1',
        titles: titles.join('|'),
        ...cont,
      });
      for (const step of [...(body.query?.normalized ?? []), ...(body.query?.redirects ?? [])]) {
        alias.set(step.from, step.to);
      }
      for (const p of body.query?.pages ?? []) {
        const text = p.revisions?.[0]?.slots?.main?.content;
        if (typeof text === 'string') content.set(p.title, text);
        else if (p.missing || p.invalid) content.set(p.title, null);
      }
      cont = body.continue ?? {};
    } while (Object.keys(cont).length > 0);

    const out: Record<string, string | null> = {};
    for (const t of titles) {
      let final = t;
      for (let i = 0; i < 5 && alias.has(final); i++) final = alias.get(final)!;
      out[t] = content.get(final) ?? null;
    }
    return out;
  }

  return {
    async pages(titles) {
      const out: Record<string, string | null> = {};
      for (let i = 0; i < titles.length; i += BATCH) Object.assign(out, await batch(titles.slice(i, i + BATCH)));
      return out;
    },
    async category(title) {
      const out: string[] = [];
      let cont: Record<string, string> = {};
      do {
        const body = await call({
          action: 'query',
          list: 'categorymembers',
          cmtitle: title,
          cmnamespace: '0',
          cmlimit: '500',
          ...cont,
        });
        for (const m of body.query?.categorymembers ?? []) out.push(m.title);
        cont = body.continue ?? {};
      } while (Object.keys(cont).length > 0);
      return out;
    },
  };
}
