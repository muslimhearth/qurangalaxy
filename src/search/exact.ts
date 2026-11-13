import type { Root } from '../data/types';
import { MATCHERS } from './matchers';
import type { Match, Matcher } from './types';

/** An English meaning at least this strong marks the query as an English word. */
const ENGLISH_WORD = 0.98;
/**
 * Latin-spelling scores are scaled by this for English words, so "sea" finds بحر (sea)
 * before ساءَ, which "sea" happens to spell.
 */
const SPELLING_YIELD = 0.85;

/** Runs every matcher and keeps the best match per root (unsorted). */
export function exactMatches(roots: readonly Root[], query: string, matchers: Matcher[] = MATCHERS): Match[] {
  if (!query.trim()) return [];
  const all = matchers.flatMap((matcher) => matcher(roots, query));
  const englishWord = all.some((m) => m.reason.kind === 'english' && m.score >= ENGLISH_WORD);
  const best = new Map<number, Match>();
  for (const raw of all) {
    const m = englishWord && raw.reason.kind === 'latin' ? { ...raw, score: raw.score * SPELLING_YIELD } : raw;
    const old = best.get(m.id);
    if (!old || m.score > old.score) best.set(m.id, m);
  }
  return [...best.values()];
}

/** Sorts matches by score, then by the root's word count; keeps the first `limit`. */
export function rankMatches(roots: readonly Root[], matches: Match[], limit: number): Match[] {
  return [...matches]
    .sort((a, b) => b.score - a.score || roots[b.id]!.count - roots[a.id]!.count)
    .slice(0, limit);
}

/** Exact search: best matches first, ties broken by word count. */
export function searchRoots(roots: readonly Root[], query: string, limit = 8): Match[] {
  return rankMatches(roots, exactMatches(roots, query), limit);
}
