import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../../data/fixture';
import { buildAdjacency } from '../neighbors';
import { focusPlan } from './plan';
import { ringRadius } from './ring';

const { roots, edges } = fixtureGalaxy;
const adj = buildAdjacency(roots.length, edges);

// Root 0 has radius 0.2, the others 1 (the largest).
const radii = new Float32Array([0.2, 1, 1, 1, 1, 1]);

describe('focusPlan', () => {
  it('is empty without a selection', () => {
    const p = focusPlan(roots, adj, null, [0, 0, 1], 1, radii);
    expect(p.ids).toEqual([]);
    expect(p.targets).toHaveLength(0);
  });

  it('moves the strongest neighbors, strongest first, around the selected root', () => {
    const p = focusPlan(roots, adj, 1, [0, 0, 1], 1.4, radii);
    expect(p.ids).toEqual([0, 2, 4]);
    expect(p.ids).not.toContain(1);
    const c = roots[1]!.pos;
    const dist = (k: number) =>
      Math.hypot(p.targets[k * 3]! - c[0], p.targets[k * 3 + 1]! - c[1], p.targets[k * 3 + 2]! - c[2]);
    for (let k = 0; k < 3; k++) expect(dist(k)).toBeLessThan(ringRadius(1) * 1.4);
    expect(dist(0)).toBeLessThan(dist(2));
    // The ring faces the camera on +z: all targets share the selected root's depth.
    for (let k = 0; k < 3; k++) expect(p.targets[k * 3 + 2]).toBeCloseTo(c[2]);
  });

  it('lifts small stars so every ring label sits as high above its ring point', () => {
    const same = new Float32Array(6).fill(1);
    const lifted = focusPlan(roots, adj, 1, [0, 0, 1], 1.4, radii);
    const plain = focusPlan(roots, adj, 1, [0, 0, 1], 1.4, same);
    // Root 0 (first in the ring): label anchor = y + 1.2 r, kept at ring y + 1.2 · largest radius.
    expect(lifted.targets[1]! - plain.targets[1]!).toBeCloseTo(1.2 * (1 - 0.2));
    expect(lifted.targets[0]).toBeCloseTo(plain.targets[0]!);
    expect(lifted.targets[4]).toBeCloseTo(plain.targets[4]!); // root 2 is already the largest size
  });
});
