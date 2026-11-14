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
      if (i > 1 && j > 1 && qc === t.charCodeAt(j - 2) && q.charCodeAt(i - 2) === tc) d = Math.min(d, prev2[j - 2]! + 1);
      cur[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  // A substring may end anywhere in t: take the best end.
  let best = inside ? max + 1 : prev[n]!;
  if (inside) for (let j = 0; j <= n; j++) best = Math.min(best, prev[j]!);
  return Math.min(best, max + 1);
}

/** Edit distance between two words, capped at `max + 1`. */
export function editDistance(a: string, b: string, max: number): number {
  return distance(a, b, max, false);
}

/** Smallest edit distance between `q` and any part of `t`, capped at `max + 1`. */
export function substringDistance(q: string, t: string, max: number): number {
  return distance(q, t, max, true);
}

/**
 * Typo score of query word `q` against verse word `t` (both normalized, stems given):
 * `TYPO_SCORE[edits]` within the edits `maxEdits` allows, else 0. English compares whole
 * words and stems; transliteration looks inside words, as its exact search does.
 */
export function typoScore(q: string, qStem: string, t: string, tStem: string, lang: VerseLang): number {
  const max = maxEdits(q.length);
  if (max === 0) return 0;
  let edits: number;
  if (lang === 'tr') {
    // Too short to hold the query even with all allowed drops.
    if (t.length < q.length - max) return 0;
    edits = substringDistance(q, t, max);
  } else {
    edits = editDistance(q, t, max);
    // Stems catch a typo plus another ending ("patiance" ~ "patient").
    const stemMax = Math.min(max, maxEdits(qStem.length));
    if (edits > 1 && stemMax > 0) edits = Math.min(edits, editDistance(qStem, tStem, stemMax));
  }
  return edits >= 1 && edits <= max ? TYPO_SCORE[edits as 1 | 2] : 0;
}
