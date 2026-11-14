/** Retrieval metrics for the semantic eval. */

/** 1-based rank of the first item of `ranked` that is in `expected`, or null. */
export function firstHitRank(ranked: readonly string[], expected: readonly string[]): number | null {
  const i = ranked.findIndex((r) => expected.includes(r));
  return i < 0 ? null : i + 1;
}

/** Share of the `expected` items found in the first `k` of `ranked` (0 when nothing is expected). */
export function recallAt(ranked: readonly string[], expected: readonly string[], k: number): number {
  if (expected.length === 0) return 0;
  const top = new Set(ranked.slice(0, k));
  return expected.filter((e) => top.has(e)).length / expected.length;
}

/** Share of queries with a hit at rank 1, in the top 5, and the mean reciprocal rank. */
export function summarize(ranks: readonly (number | null)[]): { hit1: number; hit5: number; mrr: number } {
  const n = ranks.length;
  const hit1 = ranks.filter((r) => r === 1).length / n;
  const hit5 = ranks.filter((r) => r !== null && r <= 5).length / n;
  const mrr = ranks.reduce<number>((s, r) => s + (r ? 1 / r : 0), 0) / n;
  return { hit1, hit5, mrr };
}
