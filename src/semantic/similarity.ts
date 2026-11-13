/** Cosine search over the int8 verse matrix. */

/**
 * Cosine similarity of a unit-length query with every row of an int8 matrix whose rows
 * were unit length before quantization: a plain dot product divided by the scale.
 */
export function cosineScores(query: Float32Array, matrix: Int8Array, scale: number, dims: number): Float32Array {
  if (query.length !== dims) throw new Error(`Query has ${query.length} values, dims is ${dims}`);
  const rows = Math.floor(matrix.length / dims);
  const scores = new Float32Array(rows);
  for (let r = 0, base = 0; r < rows; r++, base += dims) {
    let dot = 0;
    for (let i = 0; i < dims; i++) dot += query[i]! * matrix[base + i]!;
    scores[r] = dot / scale;
  }
  return scores;
}

/** Indices of the `k` highest scores, best first; ties go to the lower index. */
export function topK(scores: Float32Array, k: number): number[] {
  const idx = Array.from(scores.keys());
  idx.sort((a, b) => scores[b]! - scores[a]! || a - b);
  return idx.slice(0, k);
}
