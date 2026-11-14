/**
 * How raw verse vectors become the shipped int8 matrix: text window, neighbour context and
 * short-verse factor.
 */
import type { EmbeddingsMeta, VerseKey } from '../../src/data/types';
import { encodeEmbeddings } from '../../src/semantic/encode';
import { l2normalize } from '../../src/semantic/quantize';
import { lengthFactors, mixNeighbours } from './context';

/** Settings for one embedding set. */
export interface Recipe {
  /**
   * Weight of the window vector (previous + verse + next embedded as one text) against the
   * verse's own vector; 0 = verse alone.
   */
  window: number;
  /** Weight of the verse itself against the mean of its neighbours' vectors (1 = no context). */
  self: number;
  /** Self weight for verses shorter than `shortWords` words (they need context most). */
  shortSelf: number;
  /** A verse with fewer words than this counts as short. */
  shortWords: number;
  /** Short-verse factor power: (words / shortWords) ^ power; 0 = no factor. */
  lengthPower: number;
}

/** Plain vectors: no context, no short-verse factor. */
export const PLAIN: Recipe = { window: 0, self: 1, shortSelf: 1, shortWords: 12, lengthPower: 0 };

/** The recipe behind the committed public/data/embeddings.* (chosen with `pnpm eval:semantic --sweep`). */
export const SHIPPED: Recipe = { ...PLAIN, self: 0.7, shortSelf: 0.7, lengthPower: 0.1 };

/** Short text for eval tables, e.g. "window 0.5 self 0.7/0.5 pow 0.3 <12w". */
export function describeRecipe(r: Recipe): string {
  const parts: string[] = [];
  if (r.window !== 0) parts.push(`window ${r.window}`);
  if (r.self !== 1 || r.shortSelf !== 1) parts.push(`self ${r.self}/${r.shortSelf}`);
  if (r.lengthPower !== 0) parts.push(`pow ${r.lengthPower}`);
  if (parts.length === 0) return 'plain';
  return r.self !== 1 || r.shortSelf !== 1 || r.lengthPower !== 0 ? `${parts.join(' ')} <${r.shortWords}w` : parts.join(' ');
}

/**
 * Applies a recipe to raw verse vectors (in Quran order) and packs them.
 * `windowVectors` (same order) is needed only when `r.window` > 0.
 */
export function applyRecipe(
  model: string,
  keys: VerseKey[],
  vectors: readonly Float32Array[],
  wordCounts: readonly number[],
  r: Recipe,
  windowVectors?: readonly Float32Array[],
): { bin: Uint8Array; meta: EmbeddingsMeta } {
  let own = vectors;
  if (r.window > 0) {
    if (!windowVectors) throw new Error('This recipe needs window vectors');
    own = vectors.map((v, i) => {
      const a = l2normalize(v);
      const b = l2normalize(windowVectors[i]!);
      return a.map((x, d) => (1 - r.window) * x + r.window * b[d]!);
    });
  }
  const short = (i: number) => wordCounts[i]! < r.shortWords;
  const mixed = mixNeighbours(keys, own, (i) => (short(i) ? r.shortSelf : r.self));
  const factors = lengthFactors(wordCounts, { words: r.shortWords, power: r.lengthPower });
  return encodeEmbeddings(model, keys, mixed, factors);
}
