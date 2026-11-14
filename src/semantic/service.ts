/** Semantic search as one service: query text in, scored roots out. */
import type { Match } from '../search/types';
import type { Embedder } from './embedder';
import type { VerseHit } from './aggregate';
import { searchIndex, searchVerses, type SemanticIndex } from './verseIndex';

/** What the UI needs from semantic search. */
export interface SemanticService {
  /** Loads the model and the verse embeddings; resolves when both are ready. */
  warm(): Promise<void>;
  /** Roots for a phrase, best first. */
  search(query: string): Promise<Match[]>;
  /** Verses closest in meaning to a phrase, best first. */
  searchVerses(query: string): Promise<VerseHit[]>;
}

/** Joins an embedder (with a model-ready signal) and the verse index loader. */
export function createSemanticService(
  embedder: Embedder & { ready(): Promise<void> },
  loadIndex: () => Promise<SemanticIndex>,
): SemanticService {
  return {
    async warm() {
      await Promise.all([embedder.ready(), loadIndex()]);
    },
    async search(query) {
      const [index, [vector]] = await Promise.all([loadIndex(), embedder.embed([query], 'query')]);
      return searchIndex(index, vector!, query);
    },
    async searchVerses(query) {
      const [index, [vector]] = await Promise.all([loadIndex(), embedder.embed([query], 'query')]);
      return searchVerses(index, vector!);
    },
  };
}
