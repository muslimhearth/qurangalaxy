/**
 * Matches sources to targets (both [x0, y0, x1, y1, ...], same count) so the layout is kept:
 * both sets are cut into `bands` horizontal bands of equal count by y, and within each band
 * the i-th source from the left gets the i-th target from the left. Cheap (sorting only),
 * deterministic and free of long crossing paths. Returns `perm`: source i goes to target perm[i].
 */
export function assignTargets(src: Float32Array, dst: Float32Array, bands?: number): Int32Array {
  const n = src.length / 2;
  const k = Math.max(1, Math.min(n, bands ?? Math.round(Math.sqrt(n) / 2)));
  const s = bandOrder(src, n, k);
  const d = bandOrder(dst, n, k);
  const perm = new Int32Array(n);
  for (let i = 0; i < n; i++) perm[s[i]!] = d[i]!;
  return perm;
}

/** Point indices sorted by band (by y), then by x inside each band. Ties break by index. */
function bandOrder(p: Float32Array, n: number, k: number): number[] {
  const byY = Array.from({ length: n }, (_, i) => i).sort((a, b) => p[a * 2 + 1]! - p[b * 2 + 1]! || a - b);
  const out: number[] = [];
  for (let b = 0; b < k; b++) {
    const band = byY.slice(Math.floor((b * n) / k), Math.floor(((b + 1) * n) / k));
    band.sort((a, c) => p[a * 2]! - p[c * 2]! || a - c);
    out.push(...band);
  }
  return out;
}
