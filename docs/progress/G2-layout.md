# G2: 3D layout and clusters

## Done
- `scripts/lib/layout.ts`: `layoutGalaxy(input: LayoutInput): LayoutResult`. Signature unchanged.
- `scripts/lib/layout/clusters.ts`: seeded Louvain, merge of tiny and surplus communities, renumber by size.
- `scripts/lib/layout/anchorForce.ts`: custom d3 force that pulls each node to its cluster anchor.
- `scripts/lib/layout/geometry.ts`: Fibonacci sphere anchors, normalization to a sphere of radius 200.
- `scripts/lib/layout/random.ts`: seeded RNG (mulberry32).
- `scripts/lib/layout/synthetic.ts`: seeded synthetic graph for tests (test helper only).
- `scripts/types/d3-force-3d.d.ts`: minimal types for d3-force-3d.
- Tests for every module (25 tests in total in `pnpm test`).

## Decisions
- **Community method.** `graphology-communities-louvain`, edge weight = shared verses, `rng` seeded.
- **Merge rule.** The smallest community merges into the community it shares the most edge weight with.
  This repeats until there are at most 12 clusters and none is smaller than `max(3, ceil(1% of n))`.
  A community with no edges to others merges into the largest community. Ties break by id, so the result is stable.
- **Isolated nodes** (no edges) join the **largest cluster (0)**. No dedicated cluster, so no color slot is lost.
- **Numbering.** Cluster 0 is the largest. Ties break by the lowest node index in the cluster.
- **Forces** (d3-force-3d, 3 dimensions, 200 ticks, alpha cools to 0.001 within those ticks):
  - Link: strength = `log1p(weight) / log1p(maxWeight) / min(degree)`. Links between clusters are 10x weaker,
    so clusters separate. Rest length = 10 + both collision radii.
  - Many-body: strength -20, `theta` 1.5, `distanceMax` 60.
  - Collision: radius = `1 + 0.8 * ln(1 + count)` (log scale, because counts are very skewed).
  - Anchor pull: per-cluster anchor on a Fibonacci sphere (radius 150 in simulation units).
    Pull = `0.03 + 0.12 * t`, with `t = ln(1 + count) / ln(1 + maxCount)`. Frequent roots get a stronger pull,
    so they sit near the center of their cluster (a test checks this).
- **Start positions.** Each node starts near its anchor (seeded jitter), so the simulation converges in fewer ticks.
- **Determinism.** Three seeded generators: Louvain rng, d3 `randomSource`, start jitter. No `Math.random`.
- **Scale.** Centroid moves to the origin. The farthest node lies exactly at radius 200.

## Timings
Synthetic graph, 1,700 nodes / 8,000 edges, 12 clusters. Machine shared with other agents (load average 6 to 8).
- Clusters (Louvain + merge): about 0.1 s.
- Full `layoutGalaxy`: about 5 s (Vitest), about 5.5 s (tsx).
- Before tuning (theta 0.9, 300 ticks): about 9 s (Vitest), about 20 s (tsx). The d3-octree Barnes-Hut walk is the main cost.

## Open issues
- Parameters are tuned on synthetic data. Check them on the real graph from G1, mainly the cluster sizes
  and the cross-cluster link factor.
- Real data can give one very large Louvain community. The layout handles it, but colors will then be uneven.
  A higher Louvain `resolution` would split it, if needed.
- The deps `graphology`, `graphology-communities-louvain`, `graphology-types` were added as devDependencies
  (like `d3-force-3d`), because only the build pipeline uses them.
