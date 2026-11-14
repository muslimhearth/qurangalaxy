/**
 * Verse search in the Arabic (Tanzil Uthmani) text: typed words against word keys (see
 * `arabicKey`), plus other forms of the typed word's root through the word-form index.
 */
import type { VerseKey, Verses } from '../data/types';
import { arabicKey, arabicWords } from '../search/arabicKey';
import { exactForms, type WordFormIndex } from '../search/wordForms';
import type { VerseMatch } from './exact';
import type { SnippetPart } from './highlight';

/** Score of a verse word that is the typed word. */
export const WHOLE_WORD = 1;
/** Score of a verse word that starts with the typed word. */
export const WORD_START = 0.8;
/** Score of a verse word that is another form of the typed word's root. */
export const ROOT_FORM = 0.6;
/** Share of the score that comes from the words in order (a phrase). */
const PHRASE = 0.15;
/** Fewest key letters for a word-start match. */
const START_MIN = 3;
/** A root counts for a word form when it has at least this share of the form's Quran words. */
const ROOT_SHARE = 0.25;

/** The Arabic verse texts as word keys: each distinct key once, each verse as key ids. */
export interface ArabicVerseIndex {
  keys: VerseKey[];
  vocab: string[];
  verses: Uint32Array[];
}

/** One typed word: its key and the keys of other forms of its root (empty when none known). */
interface Term {
  key: string;
  rootKeys: Set<string>;
}

/** Builds the word-key index of the Arabic verse texts (once per data load). */
export function buildArabicIndex(verses: Verses): ArabicVerseIndex {
  const keys = Object.keys(verses) as VerseKey[];
  const ids = new Map<string, number>();
  const vocab: string[] = [];
  const list = keys.map((k) =>
    Uint32Array.from(verses[k]!.ar.split(' '), (word) => {
      const key = arabicKey(word);
      let id = ids.get(key);
      if (id === undefined) {
        id = vocab.length;
        ids.set(key, id);
        vocab.push(key);
      }
      return id;
    }),
  );
  return { keys, vocab, verses: list };
}

const indexCache = new WeakMap<Verses, ArabicVerseIndex>();

/** `buildArabicIndex`, built once per loaded verses.json (the app switches between Arabic and English queries). */
export function arabicIndexFor(verses: Verses): ArabicVerseIndex {
  let index = indexCache.get(verses);
  if (!index) indexCache.set(verses, (index = buildArabicIndex(verses)));
  return index;
}

// Root id → keys of its word forms, built once per loaded word-form index.
const rootKeyCache = new WeakMap<WordFormIndex, Map<number, Set<string>>>();

function keysByRoot(forms: WordFormIndex): Map<number, Set<string>> {
  let map = rootKeyCache.get(forms);
  if (map) return map;
  map = new Map();
  for (const key of forms.keys) {
    const entries = forms.forms[key]!;
    const total = entries.reduce((s, e) => s + e[1], 0);
    for (const [id, count] of entries) {
      // A rare reading of a form (another root) would mark many unrelated words.
      if (count < ROOT_SHARE * total) continue;
      let set = map.get(id);
      if (!set) map.set(id, (set = new Set()));
      set.add(key);
    }
  }
  rootKeyCache.set(forms, map);
  return map;
}

/** The typed words with the root forms each one stands for. */
function termsOf(query: string, forms: WordFormIndex | null): Term[] {
  return arabicWords(query)
    .map((word) => {
      const key = arabicKey(word);
      const rootKeys = new Set<string>();
      if (forms && key) {
        const hits = exactForms(forms, word);
        const total = hits.reduce((s, h) => s + h.count, 0);
        const byRoot = keysByRoot(forms);
        for (const h of hits) if (h.count >= ROOT_SHARE * total) byRoot.get(h.id)?.forEach((k) => rootKeys.add(k));
      }
      return { key, rootKeys };
    })
    .filter((t) => t.key);
}

/** How well verse word key `w` matches a typed word. */
function wordScore(term: Term, w: string): number {
  if (w === term.key) return WHOLE_WORD;
  if (term.key.length >= START_MIN && w.startsWith(term.key)) return WORD_START;
  return term.rootKeys.has(w) ? ROOT_FORM : 0;
}

/**
 * Verses whose Arabic text has the typed words: whole word 1, word start 0.8, another form of
 * the root 0.6. A verse scores the share of words found, plus a bonus when they appear in order.
 * Best first; ties keep Quran order. Each match lists the verse words to mark (1-based).
 */
export function arabicVerseMatches(
  index: ArabicVerseIndex,
  query: string,
  forms: WordFormIndex | null,
  limit: number,
): VerseMatch[] {
  const terms = termsOf(query, forms);
  if (terms.length === 0) return [];
  // perTerm[j][wordId] = score of that verse word for typed word j.
  const perTerm = terms.map((t) => Float32Array.from(index.vocab, (w) => wordScore(t, w)));
  const out: VerseMatch[] = [];
  index.verses.forEach((words, v) => {
    let found = 0;
    for (const row of perTerm) {
      let best = 0;
      for (let k = 0; k < words.length; k++) best = Math.max(best, row[words[k]!]!);
      found += best;
    }
    if (found === 0) return;
    const share = found / terms.length;
    const score = terms.length === 1 ? share : (1 - PHRASE) * share + (inOrder(perTerm, words) ? PHRASE : 0);
    out.push({ key: index.keys[v]!, score, source: 'ar' });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** True when the typed words match consecutive verse words, in order. */
function inOrder(perTerm: Float32Array[], words: Uint32Array): boolean {
  const n = perTerm.length;
  for (let i = 0; i + n <= words.length; i++) {
    let j = 0;
    while (j < n && perTerm[j]![words[i + j]!]! > 0) j++;
    if (j === n) return true;
  }
  return false;
}

/** Verse words shown before the first marked word, for context. */
const LEAD_WORDS = 2;

/**
 * The Arabic text with the words that match an Arabic `query` marked. When the first match is
 * past `lead` words, the text starts a little before it with "… " (the result row shows one line).
 * A query without Arabic words gives the whole text unmarked.
 */
export function markedArabic(text: string, query: string, forms: WordFormIndex | null, lead = 8): SnippetPart[] {
  const terms = termsOf(query, forms);
  if (terms.length === 0) return [{ text, hit: false }];
  const words = text.split(' ');
  const hits = words.map((w) => terms.some((t) => wordScore(t, arabicKey(w)) > 0));
  const first = hits.indexOf(true);
  const from = first > lead ? first - LEAD_WORDS : 0;
  const parts: SnippetPart[] = [];
  const add = (s: string, hit: boolean) => {
    const last = parts[parts.length - 1];
    if (last && !last.hit && !hit) last.text += s;
    else parts.push({ text: s, hit });
  };
  if (from > 0) add('… ', false);
  for (let i = from; i < words.length; i++) {
    if (i > from) add(' ', false);
    add(words[i]!, hits[i]!);
  }
  return parts;
}
