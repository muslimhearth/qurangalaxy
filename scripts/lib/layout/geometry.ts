import type { Vec3 } from '../../../src/data/types';

/**
 * Spreads k points evenly over a sphere of the given radius (Fibonacci lattice).
 * One point goes to the origin, because a single cluster needs no offset.
 */
export function fibonacciSphere(k: number, radius: number): Vec3[] {
  if (k === 1) return [[0, 0, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: k }, (_, i): Vec3 => {
    const y = 1 - (2 * (i + 0.5)) / k;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r * radius, y * radius, Math.sin(golden * i) * r * radius];
  });
}

/**
 * Moves the centroid of the points to the origin and scales them so the
 * farthest point lies exactly on the sphere of the given radius.
 */
export function normalizeToSphere(points: Vec3[], radius: number): Vec3[] {
  const n = points.length;
  if (n === 0) return [];
  const c = [0, 0, 0];
  for (const p of points) for (let d = 0; d < 3; d++) c[d]! += p[d]! / n;
  const centered = points.map((p): Vec3 => [p[0] - c[0]!, p[1] - c[1]!, p[2] - c[2]!]);
  const maxLen = Math.max(...centered.map(([x, y, z]) => Math.hypot(x, y, z)));
  // All points coincide: keep them at the origin instead of dividing by zero.
  const scale = maxLen > 0 ? radius / maxLen : 0;
  // "+ 0" turns -0 into 0, so the JSON output stays clean.
  return centered.map(([x, y, z]): Vec3 => [x * scale + 0, y * scale + 0, z * scale + 0]);
}
