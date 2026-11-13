import type { Edge, Vec3 } from '../../src/data/types';

/** Input to the layout step: one node per root. */
export interface LayoutInput {
  /** Word count per node, indexed by root id. */
  counts: number[];
  /** Co-occurrence edges between nodes. */
  edges: Edge[];
}

/** Output of the layout step, indexed by root id. */
export interface LayoutResult {
  positions: Vec3[];
  clusters: number[];
  clusterCount: number;
}

/**
 * Places roots in 3D and groups them into clusters.
 * STUB: spreads nodes on a Fibonacci sphere with one cluster. Replaced by goal G2 (layout).
 */
export function layoutGalaxy({ counts }: LayoutInput): LayoutResult {
  const n = counts.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const positions = counts.map((_, i): Vec3 => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r * 100, y * 100, Math.sin(golden * i) * r * 100];
  });
  return { positions, clusters: counts.map(() => 0), clusterCount: 1 };
}
