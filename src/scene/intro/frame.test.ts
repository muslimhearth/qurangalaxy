import { describe, expect, it } from 'vitest';
import { placeOnPlane, projectToPlane, textFrame } from './frame';

const bounds = { center: [10, 0, -5] as [number, number, number], radius: 100 };

describe('textFrame', () => {
  it('builds an orthonormal basis facing the start camera', () => {
    const f = textFrame(bounds, 50, 16 / 9);
    const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    expect(dot(f.right, f.up)).toBeCloseTo(0);
    expect(dot(f.up, f.normal)).toBeCloseTo(0);
    expect(dot(f.normal, f.normal)).toBeCloseTo(1);
    expect(f.normal[2]).toBeGreaterThan(0.9); // camera on the +z side
    expect(f.up[1]).toBeGreaterThan(0.9); // screen top is world +y, tilted
  });
  it('gives a wide box on desktop and a narrower one on phones', () => {
    const wide = textFrame(bounds, 50, 16 / 9);
    const tall = textFrame(bounds, 50, 0.46);
    expect(wide.width).toBeGreaterThan(wide.height);
    expect(tall.width).toBeLessThan(wide.width);
  });
});

describe('placeOnPlane / projectToPlane', () => {
  it('round-trips image points (centered, y down) without depth', () => {
    const f = textFrame(bounds, 50, 2);
    const img = Float32Array.from([0, 0, 200, 100, 100, 50]);
    const world = placeOnPlane(img, 200, 100, f, 0, 1);
    const back = projectToPlane(world, f);
    // Center pixel lands on the galaxy center.
    expect(back[4]).toBeCloseTo(0);
    expect(back[5]).toBeCloseTo(0);
    // Top-left pixel is left and up (negative y in screen orientation).
    expect(back[0]).toBeLessThan(0);
    expect(back[1]).toBeLessThan(0);
    // Fits the box.
    expect(back[2]! - back[0]!).toBeLessThanOrEqual(f.width + 1e-3);
    expect(back[3]! - back[1]!).toBeLessThanOrEqual(f.height + 1e-3);
  });
  it('reads positions out of instance matrices', () => {
    const f = textFrame(bounds, 50, 2);
    const m = new Float32Array(16);
    m.set([10 + 3, 0, -5], 12);
    expect([...projectToPlane(m, f, 16)]).toEqual([3, -0]);
  });
});
