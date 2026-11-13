import type { Vec3 } from '../data/types';
import type { Sphere } from './bounds';

/** Start view: camera height above the galaxy plane, as a share of its distance. */
export const START_ELEVATION = 0.35;
/** Start view: distance as a share of the distance that fits the whole galaxy. */
export const START_FIT = 0.9;

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
 * Zoom toward `point` (the 3D point under the pointer): camera and target both move
 * along their lines to `point`, scaled by `factor` (< 1 zooms in). The pointed point
 * stays under the pointer, as in map apps.
 */
export function zoomToward(position: Vec3, target: Vec3, point: Vec3, factor: number): Pose {
  const toward = (a: Vec3): Vec3 => [
    point[0] + (a[0] - point[0]) * factor,
    point[1] + (a[1] - point[1]) * factor,
    point[2] + (a[2] - point[2]) * factor,
  ];
  return { position: toward(position), target: toward(target) };
}

/** Unit vector from `target` to `cameraPos` (+z when they coincide). */
export function viewDirection(cameraPos: Vec3, target: Vec3): Vec3 {
  const d: Vec3 = [cameraPos[0] - target[0], cameraPos[1] - target[1], cameraPos[2] - target[2]];
  const len = Math.hypot(...d);
  return len > 1e-6 ? [d[0] / len, d[1] / len, d[2] / len] : [0, 0, 1];
}

/**
 * Pose that looks at `center` from `distance`, keeping the current viewing direction,
 * so the fly-to feels like a zoom rather than a jump to a new side.
 */
export function poseAt(center: Vec3, cameraPos: Vec3, currentTarget: Vec3, distance: number): Pose {
  const d = viewDirection(cameraPos, currentTarget);
  const c = center;
  return { target: [...c], position: [c[0] + d[0] * distance, c[1] + d[1] * distance, c[2] + d[2] * distance] };
}

/** Pose that frames `sphere` while keeping the current viewing direction (see `poseAt`). */
export function flyToPose(
  sphere: Sphere,
  cameraPos: Vec3,
  currentTarget: Vec3,
  fovDeg: number,
  aspect: number,
): Pose {
  return poseAt(sphere.center, cameraPos, currentTarget, fitDistance(sphere.radius, fovDeg, aspect));
}

/** Idle auto-rotate speed in radians per second (one turn in about 2 minutes). */
export const IDLE_SPEED = 0.05;
/** Seconds without interaction before auto-rotate starts again. */
export const IDLE_DELAY = 3;
/** Seconds over which auto-rotate eases up to full speed. */
export const IDLE_RAMP = 2;
/** Initial "last interaction" time that makes the galaxy rotate from the first frame. */
export const START_IDLE = -(IDLE_DELAY + IDLE_RAMP);

/** Longest frame step (s) the idle rotation uses, so a long pause (hidden tab) does not jump. */
export const MAX_IDLE_STEP = 0.1;

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
  // The browser stops frames in a hidden tab; the first frame back carries the whole gap.
  return IDLE_SPEED * t * t * (3 - 2 * t) * Math.min(dt, MAX_IDLE_STEP);
}

/**
 * Frame-rate independent ease of `current` toward `target` (`rate` per second).
 * Snaps when less than half a unit away, so pixel offsets settle exactly.
 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  const next = target + (current - target) * Math.exp(-rate * dt);
  return Math.abs(next - target) < 0.5 ? target : next;
}
