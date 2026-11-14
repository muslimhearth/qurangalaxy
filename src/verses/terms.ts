/** Word-level rules for verse search in English and in transliteration. */

/** Which verse text a word belongs to: the English translation or the transliteration. */
export type VerseLang = 'en' | 'tr';

/** A query word and how much it counts (0 = ignored, e.g. "the"). */
export interface QueryTerm {
  word: string;
  weight: number;
}

/** Start and end (exclusive) of one word in a text. */
export interface WordSpan {
  start: number;
  end: number;
}

// Common English words that say little about a verse. "God"/"Allah" stay: users search them.
const STOP = new Set(
  ('a an and are as at be but by did do for from had has have he her him his i if in is it its me my ' +
    'not of on or our she so that the their them then there they this those to us was we were what when ' +
    'which who whom will with you your').split(' '),
);

// Letters, digits and the apostrophes used inside words ("Allah's", "turja'u").
const WORD = /[\p{L}\p{N}'’`ʿʾ]+/gu;

/**
 * Search form of one word: lowercase, no accents, no apostrophes. Transliteration also
 * folds doubled letters ("alrraheemi" → "alrahemi") and Tanzil's "AA" for ʿayn.
 */
export function normalizeWord(word: string, lang: VerseLang): string {
  const base = word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`ʿʾ]/g, '');
  return lang === 'tr' ? base.replace(/(.)\1+/g, '$1') : base;
}

/** Positions of the words in `text`. */
export function wordSpans(text: string): WordSpan[] {
  return [...text.matchAll(WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

/** Search forms of the words in `text`. */
export function textWords(text: string, lang: VerseLang): string[] {
  return (text.match(WORD) ?? []).map((w) => normalizeWord(w, lang)).filter(Boolean);
}

/** Query words with weights: English stop words count 0 (unless all are stop words); short transliteration words count half. */
export function queryTerms(query: string, lang: VerseLang): QueryTerm[] {
  const words = textWords(query, lang);
  if (lang === 'tr') return words.map((word) => ({ word, weight: word.length <= 2 ? 0.5 : 1 }));
  const allStop = words.every((w) => STOP.has(w));
  return words.map((word) => ({ word, weight: !allStop && STOP.has(word) ? 0 : 1 }));
}

// Common English endings, longest first, for a light stem: "patience" ~ "patient", "believed" ~ "believe".
const SUFFIXES = ['ness', 'ence', 'ance', 'ing', 'ers', 'ent', 'ant', 'ed', 'es', 'er', 'ly', 's'];

/** Light English stem: drops one common ending and a final "e" when 4 letters stay. */
export function stem(word: string): string {
  let w = word;
  const suffix = SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length >= 4);
  if (suffix) w = w.slice(0, -suffix.length);
  return w.length > 4 && w.endsWith('e') ? w.slice(0, -1) : w;
}

/**
 * How well query word `q` matches verse word `t` (both normalized): 1 = same word,
 * 0.9 = same English stem, 0.8 = partial (English: word start; transliteration: inside the word), 0 = no match.
 */
export function termScore(q: string, t: string, lang: VerseLang): number {
  return lang === 'en' ? termScoreStemmed(q, stem(q), t, stem(t), lang) : termScoreStemmed(q, q, t, t, lang);
}

/** `termScore` with the English stems already known (search compares each word many times). */
export function termScoreStemmed(q: string, qStem: string, t: string, tStem: string, lang: VerseLang): number {
  if (t === q) return 1;
  if (lang === 'en') {
    // Simple plural: "believer" ~ "believers".
    if (q.length >= 3 && (t === `${q}s` || q === `${t}s`)) return 1;
    if (q.length >= 4 && qStem === tStem) return 0.9;
    return q.length >= 4 && t.startsWith(q) ? 0.8 : 0;
  }
  // Transliteration glues prefixes and endings to words ("alrrahmani"), so look inside.
  return q.length >= 4 && t.includes(q) ? 0.8 : 0;
}
