/** The seam between search logic and the embedding model, so tests can use a fake. */

/** A query is a short search phrase; a passage is a verse. Some models embed them differently. */
export type TextKind = 'query' | 'passage';

/** Turns texts into unit-length vectors. */
export interface Embedder {
  embed(texts: string[], kind: TextKind): Promise<Float32Array[]>;
}

/** Model download progress, 0..1 over all files (bytes loaded / bytes total). */
export type ProgressListener = (fraction: number) => void;
