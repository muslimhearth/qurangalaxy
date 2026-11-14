/**
 * Word-form index: the search key of every Quran word that has a root → that root.
 * Built at data-build time into public/data/wordforms.json; the app loads it on the first Arabic query.
 */
import type { Occurrences, Verses } from '../data/types';
import { arabicKey } from './arabicKey';

/** One root of a word form: [root id, number of Quran words, most frequent Uthmani spelling]. */
export type FormEntry = [id: number, count: number, surface: string];

/** Contents of public/data/wordforms.json. */
export interface WordFormsFile {
  version: 1;
  /** Search key (see `arabicKey`) → its roots, most frequent first. Keys are sorted. */
  forms: Record<string, FormEntry[]>;
}

/** A root found for a typed word, with the Quran spelling to show. */
export interface FormHit {
  id: number;
  /** Number of Quran words behind this hit. */
  count: number;
  /** Uthmani spelling of the most frequent matching word. */
  surface: string;
}

/** The word-form index ready for lookups. */
export interface WordFormIndex {
  /** All keys, sorted (code unit order) for prefix search. */
  keys: string[];
  forms: Record<string, FormEntry[]>;
}

/** Builds the word-form index from the verse texts and the root word positions. */
export function buildWordForms(verses: Verses, occurrences: Occurrences): WordFormsFile {
  // key → root id → spelling → count
  const counts = new Map<string, Map<number, Map<string, number>>>();
  occurrences.forEach((list, id) => {
    for (const { v, w } of list) {
      const words = verses[v]?.ar.split(' ') ?? [];
      for (const pos of w) {
        const surface = words[pos - 1];
        if (!surface) continue;
        const key = arabicKey(surface);
        if (!key) continue;
        let roots = counts.get(key);
        if (!roots) counts.set(key, (roots = new Map()));
        let spellings = roots.get(id);
        if (!spellings) roots.set(id, (spellings = new Map()));
        spellings.set(surface, (spellings.get(surface) ?? 0) + 1);
      }
    }
  });
  const forms: Record<string, FormEntry[]> = {};
  for (const key of [...counts.keys()].sort()) {
    const entries: FormEntry[] = [];
    for (const [id, spellings] of counts.get(key)!) {
      let total = 0;
      let surface = '';
      let best = 0;
      for (const [s, n] of spellings) {
        total += n;
        if (n > best) [surface, best] = [s, n];
      }
      entries.push([id, total, surface]);
    }
    forms[key] = entries.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  }
  return { version: 1, forms };
}

/** Prepares a loaded wordforms.json for lookups. */
export function indexWordForms(file: WordFormsFile): WordFormIndex {
  return { keys: Object.keys(file.forms).sort(), forms: file.forms };
}

const toHit = ([id, count, surface]: FormEntry): FormHit => ({ id, count, surface });

/**
 * Roots of the Quran words whose key equals the key of `word`, most frequent first.
 * When nothing matches, it tries the key with one "لل" or "يي" as a single letter:
 * Uthmani writes ٱلَّيْل and يُحْىِ where plain text has الليل and يحيي.
 */
export function exactForms(index: WordFormIndex, word: string): FormHit[] {
  const key = arabicKey(word);
  const hit = index.forms[key] ?? index.forms[key.replace('لل', 'ل')] ?? index.forms[key.replace('يي', 'ي')];
  return (hit ?? []).map(toHit);
}

/** First index in sorted `keys` that is not less than `key`. */
function lowerBound(keys: string[], key: string): number {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid]! < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Roots of the Quran words whose key starts with the key of `word` (exact keys included),
 * counts summed per root, most frequent first. The surface is the root's most frequent form.
 */
export function prefixForms(index: WordFormIndex, word: string): FormHit[] {
  const key = arabicKey(word);
  if (!key) return [];
  const byRoot = new Map<number, FormHit & { best: number }>();
  for (let i = lowerBound(index.keys, key); i < index.keys.length && index.keys[i]!.startsWith(key); i++) {
    for (const [id, count, surface] of index.forms[index.keys[i]!]!) {
      const hit = byRoot.get(id);
      if (!hit) byRoot.set(id, { id, count, surface, best: count });
      else {
        hit.count += count;
        if (count > hit.best) [hit.surface, hit.best] = [surface, count];
      }
    }
  }
  return [...byRoot.values()]
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .map(({ id, count, surface }) => ({ id, count, surface }));
}
