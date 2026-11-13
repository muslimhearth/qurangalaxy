/** Smallest and largest star radius in scene units. */
export interface RadiusRange {
  min: number;
  max: number;
}

/**
 * Star radius range from the data's size and density, so the fixture (6 roots)
 * and the real data (~1,700 roots) both look balanced.
 * `spacing` is the typical distance between stars in a uniform sphere.
 */
export function starRadiusRange(boundingRadius: number, starCount: number): RadiusRange {
  const spacing = boundingRadius / Math.cbrt(Math.max(1, starCount));
  return { min: spacing * 0.06, max: spacing * 0.3 };
}

/** Star radius per count on a sqrt scale between `range.min` and `range.max`. */
export function starRadii(counts: readonly number[], range: RadiusRange): Float32Array {
  const roots = counts.map((c) => Math.sqrt(Math.max(0, c)));
  const lo = Math.min(...roots);
  const hi = Math.max(...roots);
  const out = new Float32Array(counts.length);
  roots.forEach((r, i) => {
    // All counts equal: no spread to show, so use the middle size.
    const t = hi > lo ? (r - lo) / (hi - lo) : 0.5;
    out[i] = range.min + t * (range.max - range.min);
  });
  return out;
}
