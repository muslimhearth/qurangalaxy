import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency } from './neighbors';
import { fitDistance, focusSphere, flyToPose } from './camera';

const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);

describe('fitDistance', () => {
  it('places the camera so a sphere fills the view angle', () => {
    // fov 90 deg, aspect 1: distance = r / sin(45 deg)
    expect(fitDistance(10, 90, 1)).toBeCloseTo(10 / Math.sin(Math.PI / 4));
  });
  it('uses the narrower horizontal fov when the view is tall', () => {
    expect(fitDistance(10, 90, 0.5)).toBeGreaterThan(fitDistance(10, 90, 1));
  });
});

describe('focusSphere', () => {
  it('centers on the root and reaches its farthest neighbor', () => {
    const s = focusSphere(fixtureGalaxy.roots, adj, 3, 1);
    expect(s.center).toEqual([6, -11, 8]);
    expect(s.radius).toBeCloseTo(Math.hypot(6 + 14, -11 + 5, 8 + 9));
  });
  it('uses the minimum radius for a root with no neighbors', () => {
    const s = focusSphere(fixtureGalaxy.roots, [[], [], [], [], [], []], 0, 4);
    expect(s.radius).toBe(4);
  });
});

describe('flyToPose', () => {
  it('keeps the current view direction and moves to the fit distance', () => {
    const pose = flyToPose({ center: [0, 0, 0], radius: 10 }, [0, 0, 50], [0, 0, 0], 90, 1);
    expect(pose.target).toEqual([0, 0, 0]);
    expect(pose.position[0]).toBeCloseTo(0);
    expect(pose.position[2]).toBeCloseTo(fitDistance(10, 90, 1));
  });
  it('falls back to +z when camera and target coincide', () => {
    const pose = flyToPose({ center: [1, 2, 3], radius: 1 }, [0, 0, 0], [0, 0, 0], 90, 1);
    expect(pose.position[2]).toBeGreaterThan(3);
  });
});
