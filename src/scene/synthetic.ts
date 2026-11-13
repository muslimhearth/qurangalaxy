import type { Edge, Galaxy, Root, Vec3 } from '../data/types';
import { randomDirection, seededRandom } from './random';

/** Size settings for a synthetic galaxy. */
export interface SyntheticOptions {
  roots: number;
  edges: number;
  clusters: number;
  radius: number;
  seed: number;
}

/**
 * Fake galaxy at real scale, for performance tests before the real data exists.
 * Root text is a Latin placeholder ("S12"), never Arabic, so it cannot be
 * mistaken for Quran data. Deterministic per seed.
 */
export function syntheticGalaxy(o: SyntheticOptions): Galaxy {
  const rand = seededRandom(o.seed);
  const centers: Vec3[] = Array.from({ length: o.clusters }, () => {
    const [x, y, z] = randomDirection(rand);
    const r = o.radius * 0.6 * Math.cbrt(rand());
    return [x * r, y * r, z * r];
  });

  const roots: Root[] = Array.from({ length: o.roots }, (_, id) => {
    const cluster = Math.floor(rand() * o.clusters);
    const c = centers[cluster]!;
    const [x, y, z] = randomDirection(rand);
    const r = o.radius * 0.35 * Math.cbrt(rand());
    // Heavy tail like real word counts: most roots rare, a few very common.
    const count = 1 + Math.floor(3000 * rand() ** 8);
    return {
      id,
      ar: `S${id}`,
      tr: `s-${id}`,
      count,
      verseCount: count,
      lemmas: [],
      pos: [c[0] + x * r, c[1] + y * r, c[2] + z * r],
      cluster,
    };
  });

  const byCluster: number[][] = Array.from({ length: o.clusters }, () => []);
  for (const r of roots) byCluster[r.cluster]!.push(r.id);

  const seen = new Set<string>();
  const edges: Edge[] = [];
  // Cap attempts so a too-dense request cannot loop forever.
  for (let tries = 0; edges.length < o.edges && tries < o.edges * 10; tries++) {
    const a = Math.floor(rand() * o.roots);
    // Mostly link inside the cluster, sometimes across.
    const pool = rand() < 0.8 ? byCluster[roots[a]!.cluster]! : null;
    const b = pool ? pool[Math.floor(rand() * pool.length)]! : Math.floor(rand() * o.roots);
    if (a === b) continue;
    const source = Math.min(a, b);
    const target = Math.max(a, b);
    const key = `${source}-${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source, target, weight: 1 + Math.floor(rand() * 10) });
  }

  return { version: 1, roots, edges, clusterCount: o.clusters };
}
