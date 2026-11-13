import type { Vec3 } from '../../data/types';
import { randomDirection, seededRandom } from '../random';
import { appearProgress, INTRO, morphProgress, twinkle } from './timeline';

/** Per-star intro data, fixed for one galaxy. */
export interface IntroPlan {
  /** Start point (xyz) of each star, inside a small core at the galaxy center. */
  target: Float32Array;
  /** Delay in seconds before the star leaves the core (inner stars first). */
  delay: Float32Array;
  /** Twinkle phase in radians. */
  phase: Float32Array;
}

/**
 * Plans a plain opening for stars given as instance matrices (`matrices`, 16 floats per star:
 * scale at 0, position at 12): every star starts at a random point in a core of radius
 * `coreRadius` around `center`, then flies to its place; stars nearer the center leave first,
 * so the galaxy grows outward.
 */
export function buildBurstPlan(matrices: Float32Array, center: Vec3, coreRadius: number, seed = 11): IntroPlan {
  const n = matrices.length / 16;
  const rand = seededRandom(seed);
  const target = new Float32Array(n * 3);
  const dist = new Float32Array(n);
  let far = 0;
  for (let i = 0; i < n; i++) {
    // Uniform in the core ball: cube root keeps the density even.
    const [x, y, z] = randomDirection(rand);
    const r = coreRadius * Math.cbrt(rand());
    target.set([center[0] + x * r, center[1] + y * r, center[2] + z * r], i * 3);
    const b = i * 16 + 12;
    dist[i] = Math.hypot(matrices[b]! - center[0], matrices[b + 1]! - center[1], matrices[b + 2]! - center[2]);
    far = Math.max(far, dist[i]!);
  }
  const delay = dist.map((d) => (far > 0 ? (INTRO.wave * d) / far : 0));
  const phase = Float32Array.from({ length: n }, () => rand() * Math.PI * 2);
  return { target, delay, phase };
}

/**
 * Writes this frame's star matrices into `out` from the galaxy matrices `base` at intro time `t`.
 * Only scale and position change, so the other entries of `out` must already match `base`.
 * At the end of the intro `out` equals `base`.
 */
export function writeIntroMatrices(out: Float32Array, base: Float32Array, plan: IntroPlan, t: number): void {
  const n = base.length / 16;
  for (let i = 0; i < n; i++) {
    const d = plan.delay[i]!;
    const m = morphProgress(t, d);
    const shimmer = 1 + (twinkle(t, plan.phase[i]!) - 1) * (1 - m);
    const s = base[i * 16]! * appearProgress(t, d) * shimmer;
    const b = i * 16;
    out[b] = s;
    out[b + 5] = s;
    out[b + 10] = s;
    for (let k = 0; k < 3; k++) {
      const g = base[b + 12 + k]!;
      out[b + 12 + k] = plan.target[i * 3 + k]! + (g - plan.target[i * 3 + k]!) * m;
    }
  }
}
