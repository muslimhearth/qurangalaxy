import type { Vec3 } from '../../data/types';
import { LABEL_LIFT } from '../labels';
import { TOP_LINKS } from '../neighbors';

/**
 * Shape of the focus ring, as a share of its vertical radius: a spiral of about one and a half
 * turns. `inner` is the radius of the strongest link, `step` the on-screen arc length between
 * neighbors (constant, so labels are evenly spaced) and `start` the angle of the first star.
 * Tuned so 20 labels do not touch on desktop, Pixel 7 and iPhone 15 (see ring.test.ts).
 */
const SPIRAL = { inner: 0.475, step: 0.51, start: Math.PI / 2 };

/** Widest ring stretch: a short, wide free area (phone above the sheet) gets an oval ring. */
const MAX_ASPECT = 2.2;

/** Ring vertical radius in largest-star radii: big stars stay small next to their labels. */
const RING_SIZE = 12;

/** Label size on screen in px (see Labels.tsx), and the margin kept to the free area's edges. */
const LABEL = { height: 20, halfWidth: 15 };
const MARGIN = 4;

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

/** How the camera shows the ring: oval stretch, distance from its target, and target lift. */
export interface RingView {
  /** Horizontal stretch of the ring (1 = circle). */
  aspect: number;
  /** Camera distance from its target, in scene units. */
  distance: number;
  /**
   * How far (scene units, along the screen's up axis) the camera target sits above the selected
   * root: the labels above the ring need more room than the stars below it.
   */
  lift: number;
}

/**
 * Fits a ring of vertical radius `radius` (scene units) into a free screen area of `freeW` x
 * `freeH` px whose vertical field of view is `fovDeg`, with room for the labels. The ring is as
 * tall as the area allows and stretched sideways to use a wide area.
 */
export function ringView(radius: number, fovDeg: number, freeW: number, freeH: number): RingView {
  // On screen the largest star has radius ry / RING_SIZE. Above the ring: a label, LABEL_LIFT
  // star radii and a margin. Below: a star radius and a margin. So the height needs
  // 2 ry + (LABEL_LIFT + 1) ry / RING_SIZE + LABEL.height + 2 MARGIN.
  const side = LABEL.halfWidth + 6;
  const fitH = (freeH - LABEL.height - 2 * MARGIN) / (2 + (LABEL_LIFT + 1) / RING_SIZE);
  const ry = Math.max(20, Math.min(fitH, freeW / 2 - side)); // never below 20 px, even in a tiny area
  const aspect = Math.min(MAX_ASPECT, Math.max(1, (freeW / 2 - side) / ry));
  const pxPerUnit = ry / radius;
  const star = ry / RING_SIZE;
  const above = LABEL.height + LABEL_LIFT * star + MARGIN;
  const below = star + MARGIN;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  return {
    aspect,
    // At this distance the plane through the target shows freeH / 2 px per tanHalf · distance units.
    distance: freeH / 2 / (tanHalf * pxPerUnit),
    // Center the ring plus its label room: look (above - below) / 2 px above the root.
    lift: (above - below) / 2 / pxPerUnit,
  };
}
