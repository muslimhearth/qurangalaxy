import { describe, expect, it } from 'vitest';
import { damp, fitDistance, flyToPose, poseAt, viewDirection, IDLE_DELAY, zoomToward, IDLE_RAMP, IDLE_SPEED, idleRotation, MAX_IDLE_STEP, START_IDLE } from './camera';

describe('fitDistance', () => {
  it('places the camera so a sphere fills the view angle', () => {
    // fov 90 deg, aspect 1: distance = r / sin(45 deg)
    expect(fitDistance(10, 90, 1)).toBeCloseTo(10 / Math.sin(Math.PI / 4));
  });
  it('uses the narrower horizontal fov when the view is tall', () => {
    expect(fitDistance(10, 90, 0.5)).toBeGreaterThan(fitDistance(10, 90, 1));
  });
});

describe('viewDirection', () => {
  it('is the unit vector from the target to the camera', () => {
    expect(viewDirection([0, 3, 4], [0, 0, 0])).toEqual([0, 0.6, 0.8]);
  });
  it('falls back to +z when camera and target coincide', () => {
    expect(viewDirection([1, 1, 1], [1, 1, 1])).toEqual([0, 0, 1]);
  });
});

describe('poseAt', () => {
  it('looks at the center from the given distance, keeping the view direction', () => {
    const pose = poseAt([1, 2, 3], [0, 0, 10], [0, 0, 0], 5);
    expect(pose.target).toEqual([1, 2, 3]);
    expect(pose.position).toEqual([1, 2, 8]);
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
    expect(idleRotation(false, 0, START_IDLE, 0.05)).toBeCloseTo(IDLE_SPEED * 0.05);
  });
  it('does not jump after the tab was hidden (one long frame)', () => {
    const normal = idleRotation(false, 100, 0, MAX_IDLE_STEP);
    expect(idleRotation(false, 100, 0, 60)).toBeCloseTo(normal);
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

describe('zoomToward', () => {
  const pos: [number, number, number] = [0, 0, 100];
  const target: [number, number, number] = [0, 0, 0];

  it('is a plain dolly when the pointer is on the target', () => {
    const p = zoomToward(pos, target, [0, 0, 0], 0.5);
    expect(p.position).toEqual([0, 0, 50]);
    expect(p.target).toEqual([0, 0, 0]);
  });

  it('moves toward the point under the pointer, which stays fixed on screen', () => {
    const p = zoomToward(pos, target, [40, 0, 0], 0.5);
    // Halfway closer, and the view shifts halfway toward the pointed point.
    expect(p.target).toEqual([20, 0, 0]);
    expect(p.position).toEqual([20, 0, 50]);
  });

  it('zooms out away from the point for factors above 1', () => {
    const p = zoomToward(pos, target, [40, 0, 0], 2);
    expect(p.target).toEqual([-40, 0, 0]);
    expect(p.position).toEqual([-40, 0, 200]);
  });
});
