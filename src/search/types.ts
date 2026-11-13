import type { Root, VerseKey } from '../data/types';

/** Which kind of search found a root. */
export type MatchKind = 'arabic' | 'latin' | 'english' | 'semantic';

/** Why a root matched: shown next to the result (e.g. "light", "نُور"). */
export interface MatchReason {
  kind: MatchKind;
  /** The text that matched: a root, a lemma, an English meaning or a phrase. */
  text: string;
}

/** One root found by a search. */
export interface Match {
  id: number;
  /** Strength in 0..1; 1 is an exact hit. Scores from different matchers are comparable. */
  score: number;
  reason: MatchReason;
  /** Semantic search only: the verses that matched best, best first. */
  verses?: VerseKey[];
}

/**
 * One way of finding roots for a query (Arabic letters, Latin spelling, English meaning...).
 * Returns any number of matches; a matcher that does not apply to the query returns [].
 */
export type Matcher = (roots: readonly Root[], query: string) => Match[];

/** Scores for the three exact tiers, shared by all exact matchers. */
export const TIER = { exact: 1, prefix: 0.8, contains: 0.6 } as const;
