/** Node helpers shared by `pnpm embeddings` and `pnpm eval:semantic`. */
import { existsSync, readFileSync } from 'node:fs';
import type { EmbeddingsMeta, Verses, VerseKey } from '../../src/data/types';
import type { Embedder } from '../../src/semantic/embedder';
import { encodeEmbeddings } from '../../src/semantic/encode';
import type { ModelSpec } from '../../src/semantic/models';
import { createPipelineEmbedder } from '../../src/semantic/pipelineEmbedder';

/** Folder that `pnpm models` fills. */
export const MODEL_DIR = 'public/models/';

/** Loads a model from public/models/ in Node; fails with a hint when it is missing. */
export function nodeEmbedder(spec: ModelSpec): Promise<Embedder> {
  if (!existsSync(`${MODEL_DIR}${spec.id}/onnx/model_quantized.onnx`)) {
    throw new Error(`Model ${spec.id} is missing. Run \`pnpm models\` (or \`pnpm models --all\`) first.`);
  }
  return createPipelineEmbedder(spec, { modelPath: MODEL_DIR, device: 'cpu' });
}

/** Reads public/data/verses.json. */
export function readVerses(): Verses {
  return JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
}

/** Embeds every verse's English text and packs the result (int8 matrix + meta). */
export async function embedVerses(
  spec: ModelSpec,
  verses: Verses,
  embedder: Embedder,
): Promise<{ bin: Uint8Array; meta: EmbeddingsMeta }> {
  const keys = Object.keys(verses) as VerseKey[];
  const started = Date.now();
  const vectors = await embedder.embed(
    keys.map((k) => verses[k]!.en),
    'passage',
  );
  console.log(`  embedded ${keys.length} verses in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  return encodeEmbeddings(spec.id, keys, vectors);
}
