/** Packs verse vectors into the embeddings.bin + embeddings.json pair. */
import type { EmbeddingsMeta, VerseKey } from '../data/types';
import { l2normalize, quantizeInt8 } from './quantize';

/** Normalizes and quantizes one vector per verse key; `bin` is the int8 matrix as bytes. */
export function encodeEmbeddings(
  model: string,
  keys: VerseKey[],
  vectors: readonly Float32Array[],
): { bin: Uint8Array; meta: EmbeddingsMeta } {
  if (vectors.length !== keys.length) throw new Error(`${vectors.length} vectors for ${keys.length} keys`);
  const { data, scale } = quantizeInt8(vectors.map(l2normalize));
  const meta: EmbeddingsMeta = { model, dims: vectors[0]?.length ?? 0, encoding: 'int8', scale, keys };
  return { bin: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), meta };
}
