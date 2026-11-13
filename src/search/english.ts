import type { Root } from '../data/types';
import { ARABIC_LETTER } from './normalize';
import { TIER, type Match, type Matcher } from './types';

// Small score steps inside a tier. A meaning that is exactly the query beats one that only
// contains it as a word (even a lemma's exact meaning beats a root's longer phrase), root
// meanings beat lemma meanings, and earlier (main) meanings beat later ones.
const LEMMA_PENALTY = 0.004;
const PARTIAL_PENALTY = 0.02;
const ORDER_STEP = 0.001;
/** Penalty for the i-th meaning in a list (capped, so it never crosses a step above). */
const orderPenalty = (i: number) => ORDER_STEP * Math.min(i, 3);
// Suffixes removed by englishStem, longest first.
const SUFFIXES = ['fulness', 'fully', 'ings', 'ness', 'ence', 'ance', 'ful', 'ing', 'ies', 'ent', 'ant', 'es', 'ed', 'ly', 'er', 's'];

/** Lowercase words of an English text. */
function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

/**
 * A light English stemmer for matching meanings: lights→light, merciful/mercy→merci,
 * patience/patient→pati, skies/sky→ski. Stems shorter than 3 letters are not used.
 */
export function englishStem(word: string): string {
  let w = word.toLowerCase();
  for (let pass = 0; pass < 2; pass++) {
    const suffix = SUFFIXES.find((s) => w.endsWith(s) && w.length - s.length >= 3);
    if (!suffix) break;
    w = w.slice(0, -suffix.length);
    if (suffix === 'ies') w += 'y';
  }
  // mercy/merci, believe/believ: unify a final y or e.
  if (w.length >= 3) w = w.replace(/y$/, 'i');
  if (w.length > 3) w = w.replace(/e$/, '');
  return w;
}

/** True when `needle` occurs in `hay` as a run of consecutive items. */
function hasRun(hay: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((n, j) => hay[i + j] === n)) return true;
  }
  return false;
}

/** Score of one meaning for the query (0 when it does not match). */
function meaningScore(meaning: string, q: string, qWords: string[], qStems: string[]): number {
  const m = meaning.toLowerCase();
  const mWords = words(m);
  if (mWords.join(' ') === qWords.join(' ')) return TIER.exact;
  if (hasRun(mWords, qWords)) return TIER.exact - PARTIAL_PENALTY;
  if (hasRun(mWords.map(englishStem), qStems)) return TIER.prefix;
  if (q.length >= 3 && m.includes(q)) return TIER.contains;
  return 0;
}

/** Best match of one root: its own meanings first, then its lemmas' meanings. */
function bestMatch(root: Root, q: string, qWords: string[], qStems: string[]): Match | null {
  let best: Match | null = null;
  const offer = (meaning: string, penalty: number) => {
    const s = meaningScore(meaning, q, qWords, qStems);
    if (s > 0 && (!best || s - penalty > best.score)) {
      best = { id: root.id, score: s - penalty, reason: { kind: 'english', text: meaning } };
    }
  };
  root.en.forEach((m, i) => offer(m, orderPenalty(i)));
  for (const l of root.lemmas) l.en.forEach((m, i) => offer(m, LEMMA_PENALTY + orderPenalty(i)));
  return best;
}

/**
 * Finds roots by English meaning (root and lemma meanings). Whole words score as exact,
 * stem matches (lights, merciful) as prefix, substrings as contains. Arabic queries give [].
 */
export const englishMatcher: Matcher = (roots, query) => {
  if (ARABIC_LETTER.test(query)) return [];
  const qWords = words(query);
  if (qWords.length === 0) return [];
  const q = qWords.join(' ');
  const qStems = qWords.map(englishStem);
  const out: Match[] = [];
  for (const root of roots) {
    const m = bestMatch(root, q, qWords, qStems);
    if (m) out.push(m);
  }
  return out;
};
