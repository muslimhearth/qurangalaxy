/** Tanzil's English transliteration: lazy loading and its small markup language. */
import { isFixtureMode } from '../data/load';
import type { VerseKey } from '../data/types';

/** Contents of public/data/translit.json: verse key → transliteration with Tanzil markup. */
export type Translit = Record<VerseKey, string>;

/** Tanzil's tags: u = long vowel or emphatic letter, b = letter not spoken, i and strong = rare stress marks. */
export type TranslitMark = 'u' | 'b' | 'i' | 'strong';

/** A run of transliteration text and the tags around it, outermost first. */
export interface TranslitSegment {
  text: string;
  marks: TranslitMark[];
}

const KNOWN = new Set<string>(['u', 'b', 'i', 'strong']);

/** Splits marked-up transliteration into runs of text with their tags. Unknown tags are dropped. */
export function translitSegments(raw: string): TranslitSegment[] {
  const out: TranslitSegment[] = [];
  const open: TranslitMark[] = [];
  const push = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    // Join neighbours with the same tags (e.g. around a dropped unknown tag).
    if (last && last.marks.join() === open.join()) last.text += text;
    else out.push({ text, marks: [...open] });
  };
  let pos = 0;
  for (const m of raw.matchAll(/<(\/?)([a-z]+)>/gi)) {
    push(raw.slice(pos, m.index));
    pos = m.index + m[0].length;
    const tag = m[2]!.toLowerCase();
    if (!KNOWN.has(tag)) continue;
    if (m[1]) {
      const at = open.lastIndexOf(tag as TranslitMark);
      if (at >= 0) open.splice(at, 1);
    } else open.push(tag as TranslitMark);
  }
  push(raw.slice(pos));
  return out;
}

/** Transliteration without its markup, for search and snippets. */
export function plainTranslit(raw: string): string {
  return raw.replace(/<\/?[a-z]+>/gi, '');
}

let cached: Promise<Translit> | null = null;

/** Clears the cache. For tests. */
export function resetTranslit(): void {
  cached = null;
}

async function fetchTranslit(): Promise<Translit> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/translit.json`);
  if (!res.ok) throw new Error(`Could not load translit.json: HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as Translit;
}

/** Loads translit.json once (empty in fixture mode: the fixture has no transliteration). */
export function loadTranslit(): Promise<Translit> {
  if (isFixtureMode()) return Promise.resolve({});
  if (!cached) {
    cached = fetchTranslit();
    // Forget a failed load so a later call can retry.
    cached.catch(() => (cached = null));
  }
  return cached;
}
