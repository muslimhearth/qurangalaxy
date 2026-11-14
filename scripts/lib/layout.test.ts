import { describe, expect, it } from 'vitest';
import type { Edge, Vec3 } from '../../src/data/types';
import { layoutGalaxy, type LayoutResult } from './layout';
import { syntheticGraph } from './layout/synthetic';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function centroid(points: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const [x, y, z] of points) (c[0] += x / points.length), (c[1] += y / points.length), (c[2] += z / points.length);
  return c;
}

function meanPairDistance(points: Vec3[]): number {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) (sum += dist(points[i]!, points[j]!)), pairs++;
  return sum / pairs;
}

/** Checks the invariants every layout must hold. */
function expectValid(result: LayoutResult, n: number) {
  expect(result.positions).toHaveLength(n);
  expect(result.clusters).toHaveLength(n);
  expect(result.clusterCount).toBeLessThanOrEqual(12);
  for (const p of result.positions) {
    for (const v of p) expect(Number.isFinite(v)).toBe(true);
    expect(Math.hypot(...p)).toBeLessThanOrEqual(200 + 1e-6);
  }
  for (const c of result.clusters) expect(c >= 0 && c < result.clusterCount).toBe(true);
  if (n > 0) for (const v of centroid(result.positions)) expect(Math.abs(v)).toBeLessThan(1e-6);
}

describe('layoutGalaxy', () => {
  it('separates two dense cliques joined by one weak edge', () => {
    const edges: Edge[] = [];
    for (const base of [0, 8])
      for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) edges.push({ source: base + a, target: base + b, weight: 5, score: 0 });
    edges.push({ source: 7, target: 8, weight: 1, score: 0 });
    const counts = Array.from({ length: 16 }, (_, i) => 1 + i * 10);
    const result = layoutGalaxy({ counts, edges });
    expectValid(result, 16);
    expect(result.clusterCount).toBe(2);
    const left = result.positions.slice(0, 8);
    const right = result.positions.slice(8);
    const inClique = (meanPairDistance(left) + meanPairDistance(right)) / 2;
    expect(dist(centroid(left), centroid(right))).toBeGreaterThan(inClique);
  });

  it('gives valid, normalized output on a full-size graph within the time budget', () => {
    const input = syntheticGraph(1700, 8000, 30);
    const start = performance.now();
    const result = layoutGalaxy(input);
    const ms = performance.now() - start;
    console.log(`layoutGalaxy 1700 nodes / ${input.edges.length} edges: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(20_000);
    expectValid(result, 1700);
    // The farthest point sits on the sphere surface.
    expect(Math.max(...result.positions.map((p) => Math.hypot(...p)))).toBeCloseTo(200, 6);
  }, 30_000);

  it('puts frequent roots nearer their cluster center than rare roots', () => {
    const { counts, edges } = syntheticGraph(1700, 8000, 30);
    const { positions, clusters, clusterCount } = layoutGalaxy({ counts, edges });
    let frequentSum = 0;
    let rareSum = 0;
    for (let c = 0; c < clusterCount; c++) {
      const members = clusters.flatMap((k, i) => (k === c ? [i] : []));
      const center = centroid(members.map((i) => positions[i]!));
      const sorted = [...members].sort((a, b) => counts[b]! - counts[a]!);
      const top = sorted.slice(0, Math.ceil(sorted.length / 10));
      const bottom = sorted.slice(-Math.ceil(sorted.length / 2));
      const mean = (ids: number[]) => ids.reduce((s, i) => s + dist(positions[i]!, center), 0) / ids.length;
      frequentSum += mean(top);
      rareSum += mean(bottom);
    }
    expect(frequentSum).toBeLessThan(rareSum);
  }, 30_000);

  it('is deterministic', () => {
    const input = syntheticGraph(300, 1200, 8, 5);
    expect(layoutGalaxy(input)).toEqual(layoutGalaxy(input));
  });

  it('handles 0 nodes, 1 node and nodes without edges', () => {
    expect(layoutGalaxy({ counts: [], edges: [] })).toEqual({ positions: [], clusters: [], clusterCount: 0 });
    expect(layoutGalaxy({ counts: [42], edges: [] })).toEqual({ positions: [[0, 0, 0]], clusters: [0], clusterCount: 1 });
    expectValid(layoutGalaxy({ counts: [1, 5, 100, 3], edges: [] }), 4);
    const mixed = layoutGalaxy({ counts: [3, 3, 3, 1, 1], edges: [{ source: 0, target: 1, weight: 2, score: 0 }, { source: 1, target: 2, weight: 2, score: 0 }] });
    expectValid(mixed, 5);
  });
});
