import type { Vec3 } from '../../data/types';
import { TOP_LINKS } from '../neighbors';

/**
 * Shape of the focus ring, as a share of its vertical radius: a spiral of about one and a half
 * turns. `inner` is the radius of the strongest link, `step` the on-screen arc length between
 * neighbors (constant, so labels are evenly spaced) and `start` the angle of the first star.
 * Tuned so 20 labels do not touch on a phone or on desktop (see ring.test.ts).
 */
const SPIRAL = { inner: 0.45, step: 0.42, start: (110 * Math.PI) / 180 };

/** Widest ring stretch: wide screens get an oval ring, so it fits a short free area. */
const MAX_ASPECT = 1.8;

/** Ring vertical radius in largest-star radii: big stars stay small next to their labels. */
const RING_SIZE = 12;

/** Camera frame size as a share of the ring radius: leaves room for the outer labels. */
export const RING_FRAME = 1.3;

/** Horizontal stretch of the ring for a free screen area of width / height `freeAspect`. */
export function ringAspect(freeAspect: number): number {
  return Math.min(MAX_ASPECT, Math.max(1, freeAspect));
}

/**
 * 2D ring positions (x right, y up; 2 floats per star) for the `count` strongest links in rank
 * order, on an oval `aspect` times wider than tall (vertical radius 1). Rank k sits at radius
 * inner..1 growing with k, so closer means more shared verses. A rank always gets the same
 * place, whatever the count.
 */
export function ringLayout(count: number, aspect = 1): Float32Array {
  const out = new Float32Array(count * 2);
  let angle = SPIRAL.start;
  for (let k = 0; k < count; k++) {
    const r = SPIRAL.inner + ((1 - SPIRAL.inner) * k) / (TOP_LINKS - 1);
    out[k * 2] = aspect * r * Math.cos(angle);
    out[k * 2 + 1] = r * Math.sin(angle);
    // Same arc length on the oval for every step: divide by the local speed |d(x, y)/dθ|.
    angle += SPIRAL.step / (r * Math.hypot(aspect * Math.sin(angle), Math.cos(angle)));
  }
  return out;
}

/** Unit screen axes for a camera looking along `-toCamera`: right and up, up as close to world +y as possible. */
export function viewBasis(toCamera: Vec3): { right: Vec3; up: Vec3 } {
  const len = Math.hypot(...toCamera) || 1;
  const d: Vec3 = [toCamera[0] / len, toCamera[1] / len, toCamera[2] / len];
  // World up minus its part along the view; fall back to -z when looking straight down.
  let up: Vec3 = [-d[1] * d[0], 1 - d[1] * d[1], -d[1] * d[2]];
  if (Math.hypot(...up) < 1e-3) up = [0, 0, -1];
  const ul = Math.hypot(...up);
  up = [up[0] / ul, up[1] / ul, up[2] / ul];
  // right = up × d
  const right: Vec3 = [up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]];
  return { right, up };
}

/**
 * World positions (3 floats per star) of the `count` strongest links around `center`, in the
 * plane facing the camera (`toCamera` points from the center to the camera). `radius` is the
 * vertical ring radius, `aspect` the horizontal stretch.
 */
export function ringTargets(
  center: Vec3,
  toCamera: Vec3,
  count: number,
  radius: number,
  aspect = 1,
): Float32Array {
  const { right, up } = viewBasis(toCamera);
  const ring = ringLayout(count, aspect);
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const x = ring[k * 2]! * radius;
    const y = ring[k * 2 + 1]! * radius;
    for (let c = 0; c < 3; c++) out[k * 3 + c] = center[c]! + right[c]! * x + up[c]! * y;
  }
  return out;
}

/** Ring vertical radius in scene units for a galaxy whose largest star has radius `maxStarRadius`. */
export function ringRadius(maxStarRadius: number): number {
  return maxStarRadius * RING_SIZE;
}

/**
 * Camera distance that shows a ring of vertical radius `radius` and stretch `aspect`, plus room
 * for its labels, in a free area of vertical field of view `fovDeg` and width / height `freeAspect`.
 */
export function ringDistance(radius: number, fovDeg: number, freeAspect: number, aspect: number): number {
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  // The ring lies in the plane through the target, facing the camera: a plain tangent fit.
  return (radius * RING_FRAME) / Math.min(tanV, (tanV * freeAspect) / aspect);
}
