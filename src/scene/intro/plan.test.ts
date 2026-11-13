import { describe, expect, it } from 'vitest';
import { seededRandom } from '../random';
import { textFrame } from './frame';
import { buildDustPlan, buildIntroPlan, writeIntroMatrices } from './plan';
import { INTRO, introLength } from './timeline';

const frame = textFrame({ center: [0, 0, 0], radius: 50 }, 50, 16 / 9);

/** Galaxy matrices for `n` random stars with radii 0.5..1.5. */
function galaxy(n: number): Float32Array {
  const r = seededRandom(9);
  const m = new Float32Array(n * 16);
  for (let i = 0; i < n; i++) {
    const s = 0.5 + r();
    m.set([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, r() * 100 - 50, r() * 100 - 50, r() * 100 - 50, 1], i * 16);
  }
  return m;
}
const glyphs = (n: number) => {
  const r = seededRandom(4);
  return Float32Array.from({ length: n * 3 }, (_, k) => (k % 3 === 2 ? 0 : r() * 40 - 20));
};

describe('buildIntroPlan', () => {
  const base = galaxy(200);
  const plan = buildIntroPlan(base, glyphs(200), frame);

  it('uses every glyph point once', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 200; i++) keys.add([...plan.target.subarray(i * 3, i * 3 + 3)].join());
    expect(keys.size).toBe(200);
  });
  it('pulls the biggest star least', () => {
    let big = 0;
    for (let i = 1; i < 200; i++) if (base[i * 16]! > base[big * 16]!) big = i;
    expect(Math.min(...plan.pull)).toBe(plan.pull[big]);
  });
  it('is deterministic', () => expect(buildIntroPlan(base, glyphs(200), frame)).toEqual(plan));
});

describe('writeIntroMatrices', () => {
  const base = galaxy(50);
  const plan = buildIntroPlan(base, glyphs(50), frame);

  it('ends exactly at the galaxy matrices', () => {
    const out = base.slice();
    writeIntroMatrices(out, base, plan, introLength);
    expect(out).toEqual(base);
  });
  it('starts invisible and leans toward the glyphs during the hold', () => {
    const out = base.slice();
    writeIntroMatrices(out, base, plan, 0);
    expect(out[0]).toBe(0);
    writeIntroMatrices(out, base, plan, INTRO.appear + 0.5);
    for (const k of [0, 1, 2]) {
      const g = base[12 + k]!;
      expect(out[12 + k]).toBeCloseTo(g + (plan.target[k]! - g) * plan.pull[0]!, 4);
    }
    expect(out[0]).toBeGreaterThan(base[0]! * 0.8);
  });
});

describe('buildDustPlan', () => {
  it('gives one drift and timing per particle', () => {
    const d = buildDustPlan(glyphs(100), frame, 10);
    expect(d.drift.length).toBe(300);
    expect(d.timing.length).toBe(200);
    for (let i = 0; i < 100; i++) expect(d.timing[i * 2]).toBeLessThanOrEqual(INTRO.wave + 1e-6);
  });
});
