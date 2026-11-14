/** Mixes exact and semantic verse results by the slider weight. */
import type { VerseKey } from '../data/types';
import type { VerseHit } from '../semantic/aggregate';
import type { VerseMatch } from './exact';

/**
 * Per verse: score = w × semantic + (1 − w) × exact, where the semantic similarity is scaled so
 * the best verse scores 1. A verse found by words keeps its word source (for highlighting).
 * Best first; ties keep exact results first.
 */
export function blendVerseMatches(
  exact: readonly VerseMatch[],
  semantic: readonly VerseHit[],
  weight: number,
  limit: number,
): VerseMatch[] {
  if (weight <= 0) return exact.slice(0, limit);
  const best = Math.max(0, ...semantic.map((h) => h.sim));
  const out = new Map<VerseKey, VerseMatch>();
  for (const m of exact) out.set(m.key, { ...m, score: (1 - weight) * m.score });
  if (best > 0) {
    for (const { key, sim } of semantic) {
      const part = (weight * sim) / best;
      const old = out.get(key);
      out.set(key, old ? { ...old, score: old.score + part } : { key, score: part, source: 'semantic' });
    }
  }
  return [...out.values()]
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
