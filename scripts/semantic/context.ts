/**
 * Build-time fixes for verse vectors, used by `pnpm embeddings` and `pnpm eval:semantic`:
 * - neighbour context: a short verse alone often says little ("Of the living and the dead?"),
 *   so each verse vector takes in some of its neighbours' meaning;
 * - short-verse factor: a few-word verse matches a short query too easily, so its row is
 *   stored shorter than unit length, which scales down every cosine it gets.
 */
import type { VerseKey } from '../../src/data/types';
import { l2normalize } from '../../src/semantic/quantize';

const surahOf = (key: VerseKey) => key.slice(0, key.indexOf(':'));

/**
 * Per verse: normalize(self × v + (1 − self) × mean of the previous and next verse in the
 * same surah). `selfWeight(i)` gives the weight of verse i (1 = no context).
 * `keys` must be in Quran order. A verse without neighbours keeps its own direction.
 */
export function mixNeighbours(
  keys: readonly VerseKey[],
  vectors: readonly Float32Array[],
  selfWeight: (index: number) => number,
): Float32Array[] {
  return vectors.map((vec, i) => {
    const self = selfWeight(i);
    const near = [i - 1, i + 1].filter((j) => j >= 0 && j < keys.length && surahOf(keys[j]!) === surahOf(keys[i]!));
    if (self >= 1 || near.length === 0) return l2normalize(vec);
    const out = new Float32Array(vec.length);
    for (let d = 0; d < vec.length; d++) {
      let sum = 0;
      for (const j of near) sum += vectors[j]![d]!;
      out[d] = self * vec[d]! + ((1 - self) * sum) / near.length;
    }
    return l2normalize(out);
  });
}

/** Number of words in an English verse; bracketed translator additions count too. */
export function wordCount(text: string): number {
  return text.split(/[^\p{L}\p{N}']+/u).filter(Boolean).length;
}

/** How short verses are scaled: below `words` words, by (count / words) ^ power. */
export interface LengthOptions {
  words: number;
  power: number;
}

/** Row length per verse: 1 for long verses, less than 1 for short ones. */
export function lengthFactors(counts: readonly number[], { words, power }: LengthOptions): number[] {
  return counts.map((c) => (c >= words ? 1 : Math.pow(c / words, power)));
}
