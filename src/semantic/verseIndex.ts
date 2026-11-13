/** The semantic search over verses: a query vector in, scored roots out. */
import type { EmbeddingsMeta, Occurrences, VerseKey } from '../data/types';
import type { Match } from '../search/types';
import { buildVerseRoots, rootWeights, versesToRoots } from './aggregate';
import { cosineScores, topK } from './similarity';

/** Everything the search needs, prepared once after loading. */
export interface SemanticIndex {
  meta: EmbeddingsMeta;
  matrix: Int8Array;
  verseRoots: Map<VerseKey, number[]>;
  weights: number[];
}

/** Search knobs. */
export interface SearchOptions {
  /** How many best verses feed the root scores. */
  topVerses?: number;
}

/** Number of top verses used by default; tuned with `pnpm eval:semantic`. */
export const TOP_VERSES = 40;

/** Joins the verse matrix with the root occurrences. */
export function buildIndex(meta: EmbeddingsMeta, matrix: Int8Array, occurrences: Occurrences): SemanticIndex {
  if (matrix.length !== meta.keys.length * meta.dims) {
    throw new Error(`Embedding size ${matrix.length} does not match ${meta.keys.length} × ${meta.dims}`);
  }
  return {
    meta,
    matrix,
    verseRoots: buildVerseRoots(occurrences),
    weights: rootWeights(occurrences, meta.keys.length),
  };
}

/** Roots for a unit-length query vector, best first (score 1 = best root). */
export function searchIndex(index: SemanticIndex, query: Float32Array, text: string, opts: SearchOptions = {}): Match[] {
  const { meta, matrix } = index;
  const scores = cosineScores(query, matrix, meta.scale, meta.dims);
  const hits = topK(scores, opts.topVerses ?? TOP_VERSES).map((i) => ({ key: meta.keys[i]!, sim: scores[i]! }));
  return versesToRoots(hits, index.verseRoots, index.weights, text);
}
