/** Vector helpers for the int8 embedding matrix (see `EmbeddingsMeta`). */

/** Returns a copy of `v` with length 1 (a zero vector stays zero). */
export function l2normalize(v: Float32Array): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  const out = new Float32Array(v.length);
  if (norm === 0) return out;
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm;
  return out;
}

/** An int8 matrix, row-major; real value = int8 / scale. */
export interface Int8Matrix {
  data: Int8Array;
  scale: number;
}

/**
 * Packs equal-length rows into one int8 matrix with one shared scale, chosen so the
 * largest absolute value maps to 127. Rounds half away from zero, so output is stable.
 */
export function quantizeInt8(rows: readonly Float32Array[]): Int8Matrix {
  const dims = rows[0]?.length ?? 0;
  let max = 0;
  for (const row of rows) {
    if (row.length !== dims) throw new Error(`Row length ${row.length} differs from ${dims}`);
    for (const x of row) max = Math.max(max, Math.abs(x));
  }
  const scale = max === 0 ? 1 : 127 / max;
  const data = new Int8Array(rows.length * dims);
  rows.forEach((row, r) => {
    for (let i = 0; i < dims; i++) {
      const x = row[i]! * scale;
      data[r * dims + i] = Math.sign(x) * Math.round(Math.abs(x));
    }
  });
  return { data, scale };
}

/** Reads row `index` of an int8 matrix back as floats. */
export function dequantizeRow(data: Int8Array, scale: number, index: number, dims: number): Float32Array {
  const out = new Float32Array(dims);
  for (let i = 0; i < dims; i++) out[i] = data[index * dims + i]! / scale;
  return out;
}
