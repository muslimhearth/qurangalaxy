import type { Vec3 } from '../../data/types';
import type { Sphere } from '../bounds';
import { fitDistance } from '../camera';
import { seededRandom } from '../random';

/** Start camera height over its distance: slightly above the equator (used by CameraRig too). */
export const START_ELEVATION = 0.35;
/** Start camera distance as a share of the distance that fits the whole galaxy. */
export const START_FIT = 0.9;

/** A plane through the galaxy center that faces the start camera, and the box the text may fill. */
export interface TextFrame {
  center: Vec3;
  /** Unit vector to the screen's right. */
  right: Vec3;
  /** Unit vector to the screen's top. */
  up: Vec3;
  /** Unit vector toward the camera. */
  normal: Vec3;
  /** Largest text width and height in scene units. */
  width: number;
  height: number;
}

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Text plane for the start view (see CameraRig): the camera looks at the galaxy center from
 * the +z side, a little above. The text box takes most of the view width, less on wide screens.
 */
export function textFrame(bounds: Sphere, fovDeg: number, aspect: number): TextFrame {
  const normal = norm([0, START_ELEVATION, 1]);
  const right: Vec3 = [1, 0, 0];
  // up = right × (−normal) reversed: perpendicular to both, pointing to the screen top.
  const up: Vec3 = [0, normal[2], -normal[1]];
  const dist = fitDistance(bounds.radius, fovDeg, aspect) * START_FIT * Math.hypot(1, START_ELEVATION);
  const viewH = 2 * dist * Math.tan((fovDeg * Math.PI) / 360);
  const viewW = viewH * aspect;
  const portrait = aspect < 0.9;
  return {
    center: [...bounds.center],
    right,
    up,
    normal,
    width: viewW * (portrait ? 0.86 : 0.62),
    height: viewH * (portrait ? 0.42 : 0.5),
  };
}

/**
 * Places image points (pixels, y down) on the text plane, centered and scaled to fit the
 * frame box. `depth` is the full thickness of the random offset along the normal, so the
 * words have some volume. Returns xyz triples.
 */
export function placeOnPlane(
  points: Float32Array,
  imgW: number,
  imgH: number,
  frame: TextFrame,
  depth: number,
  seed: number,
): Float32Array {
  const rand = seededRandom(seed);
  const s = Math.min(frame.width / imgW, frame.height / imgH);
  const { center: c, right: r, up: u, normal: n } = frame;
  const out = new Float32Array((points.length / 2) * 3);
  for (let i = 0; i < points.length / 2; i++) {
    const x = (points[i * 2]! - imgW / 2) * s;
    const y = (imgH / 2 - points[i * 2 + 1]!) * s;
    const z = (rand() - 0.5) * depth;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = c[k]! + r[k]! * x + u[k]! * y + n[k]! * z;
  }
  return out;
}

/**
 * Screen-like 2D coordinates of xyz points on the text plane: x to the right, y down
 * (the same orientation as image pixels). `stride` is the floats per point (3, or 16 for matrices,
 * with the position at offset 12).
 */
export function projectToPlane(points: Float32Array, frame: TextFrame, stride = 3): Float32Array {
  const offset = stride === 16 ? 12 : 0;
  const n = points.length / stride;
  const out = new Float32Array(n * 2);
  const { center: c, right: r, up: u } = frame;
  for (let i = 0; i < n; i++) {
    const b = i * stride + offset;
    const d0 = points[b]! - c[0];
    const d1 = points[b + 1]! - c[1];
    const d2 = points[b + 2]! - c[2];
    out[i * 2] = d0 * r[0] + d1 * r[1] + d2 * r[2];
    out[i * 2 + 1] = -(d0 * u[0] + d1 * u[1] + d2 * u[2]);
  }
  return out;
}
