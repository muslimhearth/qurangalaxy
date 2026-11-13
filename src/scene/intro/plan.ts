import { seededRandom } from '../random';
import { assignTargets } from './assign';
import { projectToPlane, type TextFrame } from './frame';
import { appearProgress, morphProgress, pullAmount, starDelay, twinkle } from './timeline';

/** Per-star intro data, fixed for one galaxy and one start view. */
export interface IntroPlan {
  /** Glyph point (xyz) each star leans toward. */
  target: Float32Array;
  /** How far toward its glyph point each star starts (0..1). */
  pull: Float32Array;
  /** Morph delay in seconds (right side of the text first). */
  delay: Float32Array;
  /** Twinkle phase in radians. */
  phase: Float32Array;
}

/** Normalized x on the text (0 = left edge, 1 = right edge) for 2D points. */
function xNorm(p2: Float32Array): Float32Array {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < p2.length; i += 2) {
    lo = Math.min(lo, p2[i]!);
    hi = Math.max(hi, p2[i]!);
  }
  const out = new Float32Array(p2.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = hi > lo ? (p2[i * 2]! - lo) / (hi - lo) : 0.5;
  return out;
}

/**
 * Plans the intro for stars given as instance matrices (`matrices`, 16 floats per star: scale
 * at 0, position at 12) and one glyph point per star (`glyphs`, xyz on the text plane).
 * Stars keep their layout on screen while they lean toward the words; larger stars lean less.
 */
export function buildIntroPlan(matrices: Float32Array, glyphs: Float32Array, frame: TextFrame, seed = 11): IntroPlan {
  const n = matrices.length / 16;
  const perm = assignTargets(projectToPlane(matrices, frame, 16), projectToPlane(glyphs, frame));
  const target = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) target.set(glyphs.subarray(perm[i]! * 3, perm[i]! * 3 + 3), i * 3);

  // Size rank 0..1 from the radius (matrix scale).
  const bySize = Array.from({ length: n }, (_, i) => i).sort((a, b) => matrices[a * 16]! - matrices[b * 16]! || a - b);
  const pull = new Float32Array(n);
  bySize.forEach((id, rank) => (pull[id] = pullAmount(n > 1 ? rank / (n - 1) : 0)));

  const x = xNorm(projectToPlane(target, frame));
  const delay = x.map(starDelay);
  const rand = seededRandom(seed);
  const phase = Float32Array.from({ length: n }, () => rand() * Math.PI * 2);
  return { target, pull, delay, phase };
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
    const w = plan.pull[i]! * (1 - m);
    const shimmer = 1 + (twinkle(t, plan.phase[i]!) - 1) * (1 - m);
    const s = base[i * 16]! * appearProgress(t, d) * shimmer;
    const b = i * 16;
    out[b] = s;
    out[b + 5] = s;
    out[b + 10] = s;
    for (let k = 0; k < 3; k++) {
      const g = base[b + 12 + k]!;
      out[b + 12 + k] = g + (plan.target[i * 3 + k]! - g) * w;
    }
  }
}

/** Per-particle data for the calligraphy dust. */
export interface DustPlan {
  /** Start positions (xyz) in the glyphs. */
  position: Float32Array;
  /** Drift (xyz) added as the dust dissolves. */
  drift: Float32Array;
  /** Dissolve delay in seconds (right side first) and twinkle phase, two floats per particle. */
  timing: Float32Array;
}

/** Plans the dust: each particle drifts a little outward and sideways as the words dissolve. */
export function buildDustPlan(glyphs: Float32Array, frame: TextFrame, driftLength: number, seed = 5): DustPlan {
  const n = glyphs.length / 3;
  const rand = seededRandom(seed);
  const p2 = projectToPlane(glyphs, frame);
  const x = xNorm(p2);
  const drift = new Float32Array(n * 3);
  const timing = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    // Mostly away from the text center in the plane, plus a random 3D wobble.
    const len = Math.hypot(p2[i * 2]!, p2[i * 2 + 1]!) || 1;
    const ox = p2[i * 2]! / len;
    const oy = -p2[i * 2 + 1]! / len;
    const l = driftLength * (0.4 + 0.6 * rand());
    for (let k = 0; k < 3; k++) {
      const outward = frame.right[k]! * ox + frame.up[k]! * oy;
      drift[i * 3 + k] = (outward * 0.6 + (rand() - 0.5) * 1.2) * l;
    }
    timing[i * 2] = starDelay(x[i]!);
    timing[i * 2 + 1] = rand() * Math.PI * 2;
  }
  return { position: glyphs, drift, timing };
}
