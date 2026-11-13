import { randomDirection, seededRandom } from './random';

/** Point positions and linear RGB colors for the background starfield. */
export interface Starfield {
  positions: Float32Array;
  colors: Float32Array;
}

/**
 * Distant background stars in a spherical shell between `rMin` and `rMax`.
 * Colors vary in brightness with a slight warm or cool tint. Deterministic per seed.
 */
export function starfield(count: number, rMin: number, rMax: number, seed: number): Starfield {
  const rand = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = randomDirection(rand);
    const r = rMin + rand() * (rMax - rMin);
    positions.set([x * r, y * r, z * r], i * 3);
    // Most stars faint, a few bright: cube of a uniform number.
    const b = 0.08 + 0.6 * rand() ** 3;
    const warm = rand() - 0.5; // -0.5 cool .. +0.5 warm
    colors.set([b * (1 + 0.3 * warm), b, b * (1 - 0.3 * warm)], i * 3);
  }
  return { positions, colors };
}
