import { seededRandom } from '../random';

/** The parts of a browser `ImageData` the sampler reads: RGBA bytes, row by row. */
export interface ImageLike {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

/** Alpha at or above this value counts as inside a glyph. */
const INSIDE_ALPHA = 128;

/**
 * Picks `count` well-spread points inside the opaque pixels of `img` (Poisson-disk-like
 * dart throwing). Returns pixel coordinates as [x0, y0, x1, y1, ...], y pointing down.
 * Deterministic per seed. An empty image gives points at the origin.
 */
export function sampleGlyphPoints(img: ImageLike, count: number, seed = 1): Float32Array {
  const { width: w, height: h, data } = img;
  const out = new Float32Array(count * 2);
  const rand = seededRandom(seed);

  const inside: number[] = [];
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3]! >= INSIDE_ALPHA) inside.push(i);
  if (inside.length === 0 || count === 0) return out;

  // Shuffle once (Fisher-Yates): darts then land in random order over the whole shape.
  for (let i = inside.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [inside[i], inside[j]] = [inside[j]!, inside[i]!];
  }

  // Start with a radius a bit above the packing limit, shrink until enough darts fit.
  let radius = Math.sqrt(inside.length / count) * 0.9;
  let picked: number[] = [];
  while (radius >= 0.5) {
    picked = throwDarts(inside, w, radius, count);
    if (picked.length >= count) break;
    radius *= 0.85;
  }

  for (let k = 0; k < count; k++) {
    // Too few pixels for distinct points: reuse picks (the jitter separates them a little).
    const p = picked.length > 0 ? picked[k % picked.length]! : inside[k % inside.length]!;
    out[k * 2] = (p % w) + rand();
    out[k * 2 + 1] = Math.floor(p / w) + rand();
  }
  return out;
}

/** Accepts pixels in order when no accepted pixel lies within `radius`; stops at `max`. */
function throwDarts(pixels: readonly number[], w: number, radius: number, max: number): number[] {
  const cell = radius; // a cell this size means neighbors are within 1 cell in each direction
  const grid = new Map<number, number[]>();
  const key = (cx: number, cy: number) => cy * 100_003 + cx;
  const r2 = radius * radius;
  const picked: number[] = [];
  for (const p of pixels) {
    const x = p % w;
    const y = Math.floor(p / w);
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let free = true;
    for (let dy = -1; dy <= 1 && free; dy++) {
      for (let dx = -1; dx <= 1 && free; dx++) {
        for (const q of grid.get(key(cx + dx, cy + dy)) ?? []) {
          const qx = q % w;
          const qy = Math.floor(q / w);
          if ((qx - x) ** 2 + (qy - y) ** 2 < r2) {
            free = false;
            break;
          }
        }
      }
    }
    if (!free) continue;
    picked.push(p);
    const k = key(cx, cy);
    const list = grid.get(k);
    if (list) list.push(p);
    else grid.set(k, [p]);
    if (picked.length >= max) break;
  }
  return picked;
}
