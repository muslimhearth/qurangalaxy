/**
 * Local cache of Wiktionary responses (data/raw/wiktionary/), so the data build runs
 * offline and gives the same result every time after the first fetch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendixTitle, lemmaTitles, type RootLemmas } from './fetch-plan';
import type { WikiClient } from './wiki-client';

/** Cached Wiktionary data. `null` means the page does not exist. */
export interface WikiCache {
  /** Corpus root → wikitext of its appendix page. */
  appendix: Record<string, string | null>;
  /** Page title → wikitext. */
  pages: Record<string, string | null>;
}

const FILES = { appendix: 'appendix.json', pages: 'pages.json' } as const;

/** A cache with nothing in it. */
export function emptyCache(): WikiCache {
  return { appendix: {}, pages: {} };
}

/** Reads the cache files from `dir`; missing files give empty parts. */
export function loadCache(dir: string): WikiCache {
  const cache = emptyCache();
  for (const [key, name] of Object.entries(FILES) as [keyof WikiCache, string][]) {
    const path = join(dir, name);
    if (existsSync(path)) cache[key] = JSON.parse(readFileSync(path, 'utf8'));
  }
  return cache;
}

/** Writes the cache files to `dir`, with sorted keys so files are stable. */
export function saveCache(dir: string, cache: WikiCache): void {
  mkdirSync(dir, { recursive: true });
  for (const [key, name] of Object.entries(FILES) as [keyof WikiCache, string][]) {
    const sorted = Object.fromEntries(Object.entries(cache[key]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    writeFileSync(join(dir, name), JSON.stringify(sorted));
  }
}

/** Options for fillCache. */
export interface FillOptions {
  /** More page titles to fetch once lemma pages are in (e.g. "plural of" targets). */
  extraTitles?: (cache: WikiCache) => string[];
  /** Called after each request batch so the caller can save progress. */
  onProgress?: (message: string) => void;
}

/** Number of titles fetched between progress calls (and saves). */
const CHUNK = 250;

/** Fetches every missing appendix page and lemma page into `cache`. */
export async function fillCache(
  cache: WikiCache,
  roots: RootLemmas[],
  client: WikiClient,
  { extraTitles, onProgress = () => {} }: FillOptions = {},
): Promise<void> {
  const noAppendix = roots.filter((r) => !(r.ar in cache.appendix));
  for (let i = 0; i < noAppendix.length; i += CHUNK) {
    const part = noAppendix.slice(i, i + CHUNK);
    const texts = await client.pages(part.map((r) => appendixTitle(r.ar)));
    for (const r of part) cache.appendix[r.ar] = texts[appendixTitle(r.ar)] ?? null;
    onProgress(`appendix pages: ${i + part.length}/${noAppendix.length}`);
  }

  const fetchMissing = async (titles: string[], label: string) => {
    const missing = [...new Set(titles)].filter((t) => !(t in cache.pages));
    for (let i = 0; i < missing.length; i += CHUNK) {
      const part = missing.slice(i, i + CHUNK);
      Object.assign(cache.pages, await client.pages(part));
      onProgress(`${label}: ${i + part.length}/${missing.length}`);
    }
  };
  await fetchMissing(lemmaTitles(roots), 'lemma pages');
  if (extraTitles) await fetchMissing(extraTitles(cache), 'extra pages');
}
