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

/**
 * Sphere around a root and all its neighbors (radius at least `minRadius`).
 * Centered on their bounding box, so the whole constellation fills the view.
 */
export function focusSphere(
  roots: readonly Root[],
  adj: Adjacency,
  id: number,
  minRadius: number,
): Sphere {
  const points = [id, ...(adj[id] ?? []).map((n) => n.id)].map((i) => roots[i]!.pos);
  const center = [0, 1, 2].map((k) => {
    const values = points.map((p) => p[k]!);
    return (Math.min(...values) + Math.max(...values)) / 2;
  }) as Vec3;
  let radius = minRadius;
  for (const p of points) {
    radius = Math.max(radius, Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]));
  }
  return { center, radius };
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

/** Idle auto-rotate speed in radians per second (one turn in about 2 minutes). */
export const IDLE_SPEED = 0.05;
/** Seconds without interaction before auto-rotate starts again. */
export const IDLE_DELAY = 4;
/** Seconds over which auto-rotate eases up to full speed. */
export const IDLE_RAMP = 2;
/** Initial "last interaction" time that makes the galaxy rotate from the first frame. */
export const START_IDLE = -(IDLE_DELAY + IDLE_RAMP);

/**
 * Azimuth angle to add this frame for the idle auto-rotate.
 * Zero while the user interacts and for `IDLE_DELAY` seconds after; then it eases in over `IDLE_RAMP`.
 */
export function idleRotation(
  interacting: boolean,
  now: number,
  lastInteraction: number,
  dt: number,
): number {
  const idle = now - lastInteraction - IDLE_DELAY;
  if (interacting || idle <= 0) return 0;
  // Smoothstep ramp, so the motion starts gently after the user lets go.
  const t = Math.min(1, idle / IDLE_RAMP);
  return IDLE_SPEED * t * t * (3 - 2 * t) * dt;
}

/**
 * Frame-rate independent ease of `current` toward `target` (`rate` per second).
 * Snaps when less than half a unit away, so pixel offsets settle exactly.
 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  const next = target + (current - target) * Math.exp(-rate * dt);
  return Math.abs(next - target) < 0.5 ? target : next;
}
