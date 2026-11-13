import type { Vec3 } from '../data/types';

/** A sphere in scene units. */
export interface Sphere {
  center: Vec3;
  radius: number;
}

/**
 * Sphere around a set of points: centered on their mean, reaching the farthest one.
 * Not the minimal sphere, but close enough to size the camera. Radius is at least 1.
 */
export function boundingSphere(points: readonly Vec3[]): Sphere {
  if (points.length === 0) return { center: [0, 0, 0], radius: 1 };
  const c: Vec3 = [0, 0, 0];
  for (const p of points) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  c[0] /= points.length;
  c[1] /= points.length;
  c[2] /= points.length;
  let radius = 0;
  for (const p of points) {
    radius = Math.max(radius, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  }
  return { center: c, radius: Math.max(1, radius) };
}
