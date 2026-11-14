import type { VerseKey } from '../../src/data/types';
import { parseTanzil } from './tanzil';

/**
 * Turns Tanzil's English transliteration ("txt-2" file) into verse key → text.
 * The text stays verbatim, including Tanzil's markup (<u>, <b>, <i>, <strong>).
 * Throws unless the file has exactly the verses in `keys`.
 */
export function buildTranslit(text: string, keys: readonly VerseKey[]): Record<VerseKey, string> {
  const parsed = parseTanzil(text);
  const wanted = new Set(keys);
  const missing = keys.filter((k) => !parsed.has(k));
  const extra = [...parsed.keys()].filter((k) => !wanted.has(k));
  if (missing.length) throw new Error(`Transliteration misses verses: ${missing.slice(0, 5).join(', ')}`);
  if (extra.length) throw new Error(`Transliteration has unknown verses: ${extra.slice(0, 5).join(', ')}`);
  const out = {} as Record<VerseKey, string>;
  for (const k of keys) out[k] = parsed.get(k)!;
  return out;
}
