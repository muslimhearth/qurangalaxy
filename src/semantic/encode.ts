/** Packs verse vectors into the embeddings.bin + embeddings.json pair. */
import type { EmbeddingsMeta, VerseKey } from '../data/types';
import { l2normalize, quantizeInt8 } from './quantize';

/**
 * Normalizes and quantizes one vector per verse key; `bin` is the int8 matrix as bytes.
 * Optional `factors` (one per row, default 1) shorten rows after normalizing: every cosine
 * the search computes for that verse is then multiplied by its factor.
 */
export function encodeEmbeddings(
  model: string,
  keys: VerseKey[],
  vectors: readonly Float32Array[],
  factors?: readonly number[],
): { bin: Uint8Array; meta: EmbeddingsMeta } {
  if (vectors.length !== keys.length) throw new Error(`${vectors.length} vectors for ${keys.length} keys`);
  const rows = vectors.map((v, i) => {
    const unit = l2normalize(v);
    const f = factors?.[i] ?? 1;
    return f === 1 ? unit : unit.map((x) => x * f);
  });
  const { data, scale } = quantizeInt8(rows);
  const meta: EmbeddingsMeta = { model, dims: vectors[0]?.length ?? 0, encoding: 'int8', scale, keys };
  return { bin: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), meta };
}
