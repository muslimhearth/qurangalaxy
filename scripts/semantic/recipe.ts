/** How raw verse vectors become the shipped int8 matrix: neighbour context and short-verse factor. */
import type { EmbeddingsMeta, VerseKey } from '../../src/data/types';
import { encodeEmbeddings } from '../../src/semantic/encode';
import { lengthFactors, mixNeighbours } from './context';

/** Settings for one embedding set. */
export interface Recipe {
  /** Weight of the verse itself against the mean of its neighbours (1 = no context). */
  self: number;
  /** Self weight for verses shorter than `shortWords` words (they need context most). */
  shortSelf: number;
  /** A verse with fewer words than this counts as short. */
  shortWords: number;
  /** Short-verse factor power: (words / shortWords) ^ power; 0 = no factor. */
  lengthPower: number;
}

/** Plain vectors: no context, no short-verse factor. */
export const PLAIN: Recipe = { self: 1, shortSelf: 1, shortWords: 12, lengthPower: 0 };

/** The recipe behind the committed public/data/embeddings.* (chosen with `pnpm eval:semantic --sweep`). */
export const SHIPPED: Recipe = PLAIN;

/** Short text for eval tables, e.g. "self 0.7/0.5 <12w pow 0.3". */
export function describeRecipe(r: Recipe): string {
  if (r.self === 1 && r.shortSelf === 1 && r.lengthPower === 0) return 'plain';
  const parts: string[] = [];
  if (r.self !== 1 || r.shortSelf !== 1) parts.push(`self ${r.self}/${r.shortSelf}`);
  if (r.lengthPower !== 0) parts.push(`pow ${r.lengthPower}`);
  return `${parts.join(' ')} <${r.shortWords}w`;
}

/** Applies a recipe to raw verse vectors (in Quran order) and packs them. */
export function applyRecipe(
  model: string,
  keys: VerseKey[],
  vectors: readonly Float32Array[],
  wordCounts: readonly number[],
  r: Recipe,
): { bin: Uint8Array; meta: EmbeddingsMeta } {
  const short = (i: number) => wordCounts[i]! < r.shortWords;
  const mixed = mixNeighbours(keys, vectors, (i) => (short(i) ? r.shortSelf : r.self));
  const factors = lengthFactors(wordCounts, { words: r.shortWords, power: r.lengthPower });
  return encodeEmbeddings(model, keys, mixed, factors);
}
