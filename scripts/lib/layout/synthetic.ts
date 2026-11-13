import type { Edge } from '../../../src/data/types';
import type { LayoutInput } from '../layout';
import { seededRandom } from './random';

/**
 * Builds a seeded random graph that looks like the real root graph:
 * skewed counts (1 to ~2,900), planted groups, mostly in-group edges.
 * Test helper only.
 */
export function syntheticGraph(n: number, edgeCount: number, groups: number, seed = 1): LayoutInput {
  const rng = seededRandom(seed);
  // Pareto-like counts: most roots are rare, a few are very frequent.
  const counts = Array.from({ length: n }, () => Math.min(2900, Math.max(1, Math.floor(1 / (rng() ** 1.4 + 0.00034)))));
  const group = (i: number) => i % groups;
  const weights = new Map<string, number>();
  while (weights.size < edgeCount) {
    const a = Math.floor(rng() * n);
    // 85% of edges stay inside the group of node a.
    let b = Math.floor(rng() * n);
    if (rng() < 0.85) b = group(a) + groups * Math.floor(rng() * Math.floor(n / groups));
    if (a === b || b >= n) continue;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    weights.set(key, (weights.get(key) ?? 0) + 1 + Math.floor(rng() * 5));
  }
  const edges: Edge[] = [...weights].map(([key, weight]) => {
    const [source, target] = key.split(',').map(Number) as [number, number];
    return { source, target, weight };
  });
  return { counts, edges };
}
