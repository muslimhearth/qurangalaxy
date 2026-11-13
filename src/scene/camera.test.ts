import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency } from './neighbors';
import { damp, fitDistance, focusSphere, flyToPose, IDLE_DELAY, IDLE_RAMP, IDLE_SPEED, idleRotation, START_IDLE } from './camera';

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
  it('contains the root and all its neighbors', () => {
    const s = focusSphere(fixtureGalaxy.roots, adj, 3, 1);
    for (const id of [3, ...adj[3]!.map((n) => n.id)]) {
      const p = fixtureGalaxy.roots[id]!.pos;
      const d = Math.hypot(p[0] - s.center[0], p[1] - s.center[1], p[2] - s.center[2]);
      expect(d).toBeLessThanOrEqual(s.radius + 1e-9);
    }
  });
  it('centers between the root and its neighbors, so the whole group fills the view', () => {
    // Root 3 at [6,-11,8] has one neighbor, root 4 at [-14,-5,-9]: the center is the midpoint.
    const s = focusSphere(fixtureGalaxy.roots, adj, 3, 1);
    expect(s.center).toEqual([-4, -8, -0.5]);
    expect(s.radius).toBeCloseTo(Math.hypot(20, 6, 17) / 2);
  });
  it('uses the minimum radius for a root with no neighbors', () => {
    const s = focusSphere(fixtureGalaxy.roots, [[], [], [], [], [], []], 0, 4);
    expect(s.radius).toBe(4);
    expect(s.center).toEqual([0, 0, 0]);
  });
});

describe('idleRotation', () => {
  it('is zero while the user interacts', () => {
    expect(idleRotation(true, 100, 0, 0.016)).toBe(0);
  });
  it('is zero shortly after the last interaction', () => {
    expect(idleRotation(false, 1, 0, 0.016)).toBe(0);
  });
  it('eases in instead of starting at full speed', () => {
    const early = idleRotation(false, IDLE_DELAY + 0.1, 0, 1);
    const full = idleRotation(false, IDLE_DELAY + IDLE_RAMP + 1, 0, 1);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(full / 4);
  });
  it('rotates from app start when the last interaction is set to START_IDLE', () => {
    expect(idleRotation(false, 0, START_IDLE, 1)).toBeCloseTo(IDLE_SPEED);
  });
  it('turns slowly once idle', () => {
    const a = idleRotation(false, 100, 0, 1);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(0.1);
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

describe('damp', () => {
  it('moves part of the way toward the target each frame', () => {
    const next = damp(0, 100, 8, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
  });
  it('snaps to the target once close enough', () => {
    expect(damp(99.7, 100, 8, 1 / 60)).toBe(100);
  });
});
