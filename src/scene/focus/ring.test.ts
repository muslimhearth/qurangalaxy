import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../data/types';
import { TOP_LINKS } from '../neighbors';
import { RING_FRAME, ringAspect, ringDistance, ringLayout, ringRadius, ringTargets, viewBasis } from './ring';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Screen boxes of the ring labels (30 x 20 px, as measured in the app), then the selected root's
 * label and star, for a ring of vertical radius `px` pixels and stretch `aspect`.
 */
function labelBoxes(px: number, aspect: number): Box[] {
  const ring = ringLayout(TOP_LINKS, aspect);
  const boxes: Box[] = [];
  for (let k = 0; k < TOP_LINKS; k++) {
    // Screen y grows downward; labels sit 8 px above their star.
    const x = ring[k * 2]! * px;
    const y = -ring[k * 2 + 1]! * px;
    boxes.push({ x: x - 15, y: y - 8 - 20, w: 30, h: 20 });
  }
  boxes.push({ x: -18, y: -12 - 28, w: 36, h: 28 }); // selected root label (bigger font)
  boxes.push({ x: -14, y: -14, w: 28, h: 28 }); // selected star
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
    // [vertical ring radius in px, stretch]: phone above the sheet, desktop, square, extremes.
    for (const [px, aspect] of [
      [100, 1.57],
      [250, 1.28],
      [150, 1],
      [100, 1.8],
      [120, 1.2],
    ] as const) {
      const boxes = labelBoxes(px, aspect);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          if (i === TOP_LINKS && j === TOP_LINKS + 1) continue; // selected label sits on its own star
          expect(overlap(boxes[i]!, boxes[j]!, 4), `${px}px x${aspect}: ${i} and ${j}`).toBe(false);
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

describe('ringAspect', () => {
  it('follows the free area, never narrower than a circle nor wider than 1.8', () => {
    expect(ringAspect(0.5)).toBe(1);
    expect(ringAspect(1.3)).toBe(1.3);
    expect(ringAspect(4)).toBe(1.8);
  });
});

describe('ringRadius and ringDistance', () => {
  it('scales with the largest star', () => {
    expect(ringRadius(2)).toBeCloseTo(2 * ringRadius(1));
  });

  it('fits the ring plus label room in the free area', () => {
    const tan25 = Math.tan((25 * Math.PI) / 180);
    // Wide free area: the height limits.
    expect(ringDistance(1, 50, 1.6, 1.6)).toBeCloseTo(RING_FRAME / tan25);
    // Tall free area: the width limits.
    expect(ringDistance(1, 50, 0.5, 1)).toBeCloseTo(RING_FRAME / (tan25 * 0.5));
  });
});
