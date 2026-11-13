/** Mixes exact and semantic search results by the slider weight. */
import type { Root } from '../data/types';
import { rankMatches } from './exact';
import type { Match } from './types';

/**
 * Per root: score = w × semantic + (1 − w) × exact (a missing side counts 0).
 * The reason comes from the side that adds more; semantic verses are kept.
 * Weight 0 gives the exact ranking unchanged. Sorted by `rankMatches`.
 */
export function blendMatches(
  roots: readonly Root[],
  exact: readonly Match[],
  semantic: readonly Match[],
  weight: number,
  limit: number,
): Match[] {
  if (weight <= 0) return rankMatches(roots, [...exact], limit);
  const sem = new Map(semantic.map((m) => [m.id, m]));
  const ex = new Map(exact.map((m) => [m.id, m]));
  const ids = new Set([...ex.keys(), ...sem.keys()]);
  const out: Match[] = [];
  for (const id of ids) {
    const s = sem.get(id);
    const e = ex.get(id);
    const sPart = weight * (s?.score ?? 0);
    const ePart = (1 - weight) * (e?.score ?? 0);
    const score = sPart + ePart;
    if (score <= 0) continue;
    const reason = sPart > ePart || !e ? s!.reason : e.reason;
    out.push(s?.verses ? { id, score, reason, verses: s.verses } : { id, score, reason });
  }
  return rankMatches(roots, out, limit);
}
