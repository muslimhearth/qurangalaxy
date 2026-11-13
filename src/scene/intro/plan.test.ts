import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../data/types';
import { seededRandom } from '../random';
import { buildBurstPlan, writeIntroMatrices } from './plan';
import { INTRO, introLength } from './timeline';

/** Galaxy matrices for `n` random stars with radii 0.5..1.5 around the origin. */
function galaxy(n: number): Float32Array {
  const r = seededRandom(9);
  const m = new Float32Array(n * 16);
  for (let i = 0; i < n; i++) {
    const s = 0.5 + r();
    m.set([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, r() * 100 - 50, r() * 100 - 50, r() * 100 - 50, 1], i * 16);
  }
  return m;
}
const center: Vec3 = [0, 0, 0];
const dist = (a: ArrayLike<number>, i: number) => Math.hypot(a[i]!, a[i + 1]!, a[i + 2]!);

describe('buildBurstPlan', () => {
  const base = galaxy(200);
  const plan = buildBurstPlan(base, center, 5);

  it('starts every star inside the small core', () => {
    for (let i = 0; i < 200; i++) expect(dist(plan.target, i * 3)).toBeLessThanOrEqual(5 + 1e-6);
  });

  it('lets inner stars leave first, so the galaxy grows outward', () => {
    let inner = 0;
    let outer = 0;
    for (let i = 1; i < 200; i++) if (dist(base, i * 16 + 12) < dist(base, inner * 16 + 12)) inner = i;
    for (let i = 1; i < 200; i++) if (dist(base, i * 16 + 12) > dist(base, outer * 16 + 12)) outer = i;
    expect(plan.delay[inner]!).toBeLessThan(plan.delay[outer]!);
    expect(Math.max(...plan.delay)).toBeLessThanOrEqual(INTRO.wave + 1e-6);
  });

  it('is deterministic', () => expect(buildBurstPlan(base, center, 5)).toEqual(plan));
});

describe('writeIntroMatrices', () => {
  const base = galaxy(50);
  const plan = buildBurstPlan(base, center, 5);

  it('starts invisible in the core and ends exactly at the galaxy matrices', () => {
    const out = base.slice();
    writeIntroMatrices(out, base, plan, 0);
    expect(out[0]).toBe(0);
    expect(dist(out, 12)).toBeLessThanOrEqual(5 + 1e-6);
    writeIntroMatrices(out, base, plan, introLength);
    expect(out).toEqual(base);
  });

  it('barely moves at first, then speeds up', () => {
    const out = base.slice();
    // Find the star that travels farthest and track its distance from its start point.
    const travel = (t: number) => {
      writeIntroMatrices(out, base, plan, t);
      return Math.hypot(out[12]! - plan.target[0]!, out[13]! - plan.target[1]!, out[14]! - plan.target[2]!);
    };
    const total = travel(introLength);
    expect(travel(0.3)).toBeLessThan(total * 0.02);
    expect(travel(1.4) - travel(1.0)).toBeGreaterThan(travel(1.0) - travel(0.6));
    expect(INTRO.morph).toBeLessThanOrEqual(2.5);
  });
});
