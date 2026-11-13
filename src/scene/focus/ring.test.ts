import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../data/types';
import { TOP_LINKS } from '../neighbors';
import { ringLayout, ringRadius, ringTargets, ringView, viewBasis } from './ring';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Screen boxes of the ring labels (30 x 20 px, as measured in the app), then the selected root's
 * label and star (radius `rootPx`), for a ring of vertical radius `px` pixels and stretch `aspect`.
 * Ring labels sit 1.2 largest-star radii above their ring point (focusPlan lifts small stars to
 * keep it so); the largest star radius is `px / 12` (see ringRadius).
 */
function labelBoxes(px: number, aspect: number, rootPx: number): Box[] {
  const ring = ringLayout(TOP_LINKS, aspect);
  const lift = (1.2 * px) / 12;
  const boxes: Box[] = [];
  for (let k = 0; k < TOP_LINKS; k++) {
    // Screen y grows downward.
    const x = ring[k * 2]! * px;
    const y = -ring[k * 2 + 1]! * px;
    boxes.push({ x: x - 15, y: y - lift - 20, w: 30, h: 20 });
  }
  boxes.push({ x: -18, y: -1.2 * rootPx - 28, w: 36, h: 28 }); // selected root label (bigger font)
  boxes.push({ x: -rootPx, y: -rootPx, w: 2 * rootPx, h: 2 * rootPx }); // selected star
  return boxes;
}
const overlap = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

describe('ringLayout', () => {
  const ring = ringLayout(TOP_LINKS);
  const r = (k: number) => Math.hypot(ring[k * 2]!, ring[k * 2 + 1]!);

  it('puts stronger links closer to the center, the weakest on the outer edge', () => {
    for (let k = 1; k < TOP_LINKS; k++) expect(r(k)).toBeGreaterThan(r(k - 1));
    expect(r(TOP_LINKS - 1)).toBeCloseTo(1);
    expect(r(0)).toBeGreaterThan(0.3); // room for the selected root and its label
  });

  it('keeps every position the same for fewer links', () => {
    expect(Array.from(ringLayout(3))).toEqual(Array.from(ring.subarray(0, 6)));
  });

  it('leaves labels apart on a phone (short, wide free area) and on desktop', () => {
    // [vertical ring radius in px, stretch] as ringView makes them: desktop 1280 x 720, Pixel 7 and
    // iPhone 15 above the sheet, a narrow window, and two in-between frames.
    for (const [px, aspect] of [
      [309, 1.29],
      [110, 1.68],
      [75, 2.2],
      [150, 1],
      [100, 1.57],
      [90, 2.2],
    ] as const) {
      // The selected root may be the smallest or the largest star.
      for (const rootPx of [1.5, px / 12]) {
        const boxes = labelBoxes(px, aspect, rootPx);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            if (i === TOP_LINKS && j === TOP_LINKS + 1) continue; // selected label sits on its own star
            expect(overlap(boxes[i]!, boxes[j]!, 3), `${px}px x${aspect}: ${i} and ${j}`).toBe(false);
          }
        }
      }
    }
  });

  it('stretches the ring sideways by the aspect', () => {
    const wide = ringLayout(TOP_LINKS, 1.5);
    const xs = Array.from(wide.filter((_, i) => i % 2 === 0), Math.abs);
    const ys = Array.from(wide.filter((_, i) => i % 2 === 1), Math.abs);
    expect(Math.max(...xs) / Math.max(...ys)).toBeGreaterThan(1.3);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1);
  });
});

describe('viewBasis', () => {
  it('gives right and up axes across the view, with up near the world up', () => {
    const toCamera: Vec3 = [0, 0.35, 1];
    const { right, up } = viewBasis(toCamera);
    expect(dot(right, toCamera)).toBeCloseTo(0);
    expect(dot(up, toCamera)).toBeCloseTo(0);
    expect(dot(right, up)).toBeCloseTo(0);
    expect(Math.hypot(...right)).toBeCloseTo(1);
    expect(up[1]).toBeGreaterThan(0.9);
    expect(right[0]).toBeCloseTo(1); // camera on +z looking at -z: right is +x
  });

  it('still works when looking straight down', () => {
    const { right, up } = viewBasis([0, 1, 0]);
    expect(Math.hypot(...right)).toBeCloseTo(1);
    expect(Math.hypot(...up)).toBeCloseTo(1);
  });
});

describe('ringTargets', () => {
  it('places the ring around the center, in the plane facing the camera', () => {
    const center: Vec3 = [10, -5, 3];
    const toCamera: Vec3 = [1, 0, 0];
    const t = ringTargets(center, toCamera, 5, 2, 1.5);
    for (let k = 0; k < 5; k++) {
      const d: Vec3 = [t[k * 3]! - 10, t[k * 3 + 1]! + 5, t[k * 3 + 2]! - 3];
      expect(dot(d, toCamera)).toBeCloseTo(0);
      expect(Math.hypot(...d)).toBeLessThanOrEqual(2 * 1.5 + 1e-6);
    }
  });
});

describe('ringRadius', () => {
  it('scales with the largest star', () => {
    expect(ringRadius(2)).toBeCloseTo(2 * ringRadius(1));
  });
});

describe('ringView', () => {
  const fov = 50;
  /** On-screen vertical ring radius in px for a view, from its distance. */
  const px = (v: { distance: number }, freeH: number) => (freeH / 2) * (1 / (Math.tan((fov * Math.PI) / 360) * v.distance));

  it('fills a phone free area: room for the top labels, oval up to 2.2', () => {
    // iPhone 15 above the sheet: 393 x 192 px.
    const v = ringView(1, fov, 393, 192);
    expect(px(v, 192)).toBeCloseTo(75);
    expect(v.aspect).toBe(2.2);
    // The camera looks a bit above the root, so the root sits 11 px below the middle.
    expect(v.lift * px(v, 192)).toBeCloseTo(11);
  });

  it('uses a wide desktop free area with a mild oval', () => {
    const v = ringView(1, fov, 842, 660);
    expect(px(v, 660)).toBeCloseTo(309);
    expect(v.aspect).toBeCloseTo((421 - 21) / 309);
  });

  it('keeps a circle that fits the width in a tall free area', () => {
    const v = ringView(1, fov, 400, 900);
    expect(px(v, 900)).toBeCloseTo(200 - 21);
    expect(v.aspect).toBe(1);
  });

  it('scales the distance and lift with the ring radius', () => {
    expect(ringView(3, fov, 393, 192).distance).toBeCloseTo(3 * ringView(1, fov, 393, 192).distance);
    expect(ringView(3, fov, 393, 192).lift).toBeCloseTo(3 * ringView(1, fov, 393, 192).lift);
  });
});
