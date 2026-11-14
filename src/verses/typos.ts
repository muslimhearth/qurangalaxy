/** Typo tolerance for verse search: small spelling mistakes still find a word, with a lower score. */
import type { VerseLang } from './terms';

/** Score of a typo match by number of edits (index 1 or 2). Below 0.8, the weakest exact match. */
export const TYPO_SCORE = [0, 0.6, 0.45] as const;

/** Edits allowed in a query word: none for 1–3 letters, 1 for 4–6 letters, 2 for 7 or more. */
export function maxEdits(length: number): 0 | 1 | 2 {
  if (length <= 3) return 0;
  return length <= 6 ? 1 : 2;
}

// Three reusable DP rows (two back for swaps), grown on demand: search calls this thousands of times.
let rows: [Int32Array, Int32Array, Int32Array] = [new Int32Array(32), new Int32Array(32), new Int32Array(32)];

function rowsFor(n: number): [Int32Array, Int32Array, Int32Array] {
  if (rows[0].length <= n) rows = [new Int32Array(n + 1), new Int32Array(n + 1), new Int32Array(n + 1)];
  return rows;
}

/**
 * Damerau-Levenshtein distance (optimal string alignment) from `q` to `t`, or to the best
 * substring of `t` when `inside`. Changes, additions, drops and swaps of two neighbours cost 1.
 * Returns `max + 1` as soon as the distance must be larger than `max`.
 */
function distance(q: string, t: string, max: number, inside: boolean): number {
  const m = q.length;
  const n = t.length;
  if (!inside && Math.abs(m - n) > max) return max + 1;
  let [prev2, prev, cur] = rowsFor(n);
  let spare: Int32Array;
  // Row 0: the empty query. A substring may start anywhere in t, so that costs nothing.
  for (let j = 0; j <= n; j++) prev[j] = inside ? 0 : j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const qc = q.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const tc = t.charCodeAt(j - 1);
      let d = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (qc === tc ? 0 : 1));
      // Swap of two neighbours ("pateince" ~ "patience").
      if (i > 1 && j > 1 && qc === t.charCodeAt(j - 2) && q.charCodeAt(i - 2) === tc)
        d = Math.min(d, prev2[j - 2]! + 1);
      cur[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    spare = prev2;
    prev2 = prev;
    prev = cur;
    cur = spare;
  }
  // A substring may end anywhere in t: take the best end.
  let best = inside ? max + 1 : prev[n]!;
  if (inside) for (let j = 0; j <= n; j++) best = Math.min(best, prev[j]!);
  return Math.min(best, max + 1);
}

/** Bit set of the letters in `word` (a–z; other characters share bits by code). */
export function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) mask |= 1 << (word.charCodeAt(i) % 32);
  return mask;
}

/**
 * Letters of `q` (with repeats) not in the word with letter set `mask`. Each one needs an edit,
 * so a word with more missing letters than allowed edits cannot match: a fast pre-check.
 */
export function missingLetters(q: string, mask: number): number {
  let missing = 0;
  for (let i = 0; i < q.length; i++) if (!(mask & (1 << (q.charCodeAt(i) % 32)))) missing++;
  return missing;
}

/** Edit distance between two words, capped at `max + 1`. */
export function editDistance(a: string, b: string, max: number): number {
  return distance(a, b, max, false);
}

/** Smallest edit distance between `q` and any part of `t`, capped at `max + 1`. */
export function substringDistance(q: string, t: string, max: number): number {
  return q.length > 0 && q.length <= 32 ? bitSubstring(q, t, max) : distance(q, t, max, true);
}

/** `substringDistance` by the plain table method. Slower; the reference for tests. */
export function substringDistanceTable(q: string, t: string, max: number): number {
  return distance(q, t, max, true);
}

// Letter positions of the last query (bit i = letter i of q), kept because search asks the same query thousands of times.
let peqWord = '';
const peqAscii = new Int32Array(128);
const peqOther = new Map<number, number>();

function peqOf(code: number): number {
  return code < 128 ? peqAscii[code]! : (peqOther.get(code) ?? 0);
}

function preparePeq(q: string): void {
  if (q === peqWord) return;
  peqAscii.fill(0);
  peqOther.clear();
  for (let i = 0; i < q.length; i++) {
    const c = q.charCodeAt(i);
    if (c < 128) peqAscii[c]! |= 1 << i;
    else peqOther.set(c, (peqOther.get(c) ?? 0) | (1 << i));
  }
  peqWord = q;
}

/**
 * Bit-parallel approximate substring search with swaps (Myers 1999, with Hyyrö's 2003
 * transposition term): one column of the edit table per letter of `t`, in a few 32-bit operations.
 */
function bitSubstring(q: string, t: string, max: number): number {
  preparePeq(q);
  const m = q.length;
  const top = 1 << (m - 1);
  let vp = -1; // all ones: column 0 of the table is 0, 1, 2, …, m
  let vn = 0;
  let score = m;
  let best = m;
  let d0Prev = 0;
  let pmPrev = 0;
  for (let j = 0; j < t.length; j++) {
    const pm = peqOf(t.charCodeAt(j));
    const tc = ((~d0Prev & pm) << 1) & pmPrev;
    const d0 = (((pm & vp) + vp) ^ vp) | pm | vn | tc;
    const hp = vn | ~(d0 | vp);
    const hn = vp & d0;
    if (hp & top) score++;
    else if (hn & top) score--;
    // No carry into row 0: a match may start at any letter of t.
    const x = hp << 1;
    vn = x & d0;
    vp = (hn << 1) | ~(x | d0);
    d0Prev = d0;
    pmPrev = pm;
    if (score < best) best = score;
  }
  return Math.min(best, max + 1);
}

/**
 * Typo score of query word `q` against verse word `t` (both normalized, stems given):
 * `TYPO_SCORE[edits]` within the edits `maxEdits` allows, else 0. English compares whole
 * words and stems; transliteration looks inside words, as its exact search does.
 * `tMask` (the `letterMask` of `t`, when known) skips most words without the slow distance.
 */
export function typoScore(q: string, qStem: string, t: string, tStem: string, lang: VerseLang, tMask?: number): number {
  const max = maxEdits(q.length);
  if (max === 0) return 0;
  // The stem's letters are a part of the word's, so this check is safe for both comparisons.
  if (tMask !== undefined && missingLetters(lang === 'en' ? qStem : q, tMask) > max) return 0;
  let edits: number;
  if (lang === 'tr') {
    // Too short to hold the query even with all allowed drops.
    if (t.length < q.length - max) return 0;
    edits = substringDistance(q, t, max);
  } else {
    edits = editDistance(q, t, max);
    // Stems catch a typo plus another ending ("patiance" ~ "patient").
    const stemMax = Math.min(max, maxEdits(qStem.length));
    if (edits > 1 && stemMax > 0) {
      const stemEdits = editDistance(qStem, tStem, stemMax);
      // Over the stem's own limit is no match, even if under the word's limit.
      if (stemEdits <= stemMax) edits = Math.min(edits, stemEdits);
    }
  }
  return edits >= 1 && edits <= max ? TYPO_SCORE[edits as 1 | 2] : 0;
}
