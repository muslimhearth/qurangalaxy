import type { Root, Vec3 } from '../data/types';
import type { Sphere } from './bounds';
import type { Adjacency } from './neighbors';

/** Camera position and look-at target. */
export interface Pose {
  position: Vec3;
  target: Vec3;
}

/**
 * Distance from a sphere's center at which a perspective camera sees the whole sphere.
 * `fovDeg` is the vertical field of view; a tall view (aspect < 1) uses the narrower
 * horizontal angle.
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number): number {
  const vHalf = (fovDeg * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return radius / Math.sin(Math.min(vHalf, hHalf));
}

/** Sphere centered on a root that reaches its farthest neighbor (at least `minRadius`). */
export function focusSphere(
  roots: readonly Root[],
  adj: Adjacency,
  id: number,
  minRadius: number,
): Sphere {
  const p = roots[id]!.pos;
  let radius = minRadius;
  for (const n of adj[id] ?? []) {
    const q = roots[n.id]!.pos;
    radius = Math.max(radius, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
  }
  return { center: [...p], radius };
}

/**
 * Pose that frames `sphere` while keeping the current viewing direction,
 * so the fly-to feels like a zoom rather than a jump to a new side.
 */
export function flyToPose(
  sphere: Sphere,
  cameraPos: Vec3,
  currentTarget: Vec3,
  fovDeg: number,
  aspect: number,
): Pose {
  let d: Vec3 = [
    cameraPos[0] - currentTarget[0],
    cameraPos[1] - currentTarget[1],
    cameraPos[2] - currentTarget[2],
  ];
  const len = Math.hypot(...d);
  d = len > 1e-6 ? [d[0] / len, d[1] / len, d[2] / len] : [0, 0, 1];
  const dist = fitDistance(sphere.radius, fovDeg, aspect);
  const c = sphere.center;
  return {
    target: [...c],
    position: [c[0] + d[0] * dist, c[1] + d[1] * dist, c[2] + d[2] * dist],
  };
}
