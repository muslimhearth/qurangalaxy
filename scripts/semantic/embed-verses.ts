/** Node helpers shared by `pnpm embeddings` and `pnpm eval:semantic`. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Verses, VerseKey } from '../../src/data/types';
import type { Embedder } from '../../src/semantic/embedder';
import type { ModelSpec } from '../../src/semantic/models';
import { createPipelineEmbedder } from '../../src/semantic/pipelineEmbedder';

/** Folder that `pnpm models` fills. */
export const MODEL_DIR = 'public/models/';

/** Raw (float32) verse vectors per model, so evals and rebuilds skip the slow embedding. Gitignored. */
const CACHE = 'data/raw/embeddings';

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

const surahOf = (key: VerseKey) => key.slice(0, key.indexOf(':'));

/** Each verse's English text with the previous and next verse of the same surah around it. */
export function windowTexts(keys: readonly VerseKey[], verses: Verses): string[] {
  return keys.map((k, i) => {
    const near = (j: number) => (keys[j] && surahOf(keys[j]!) === surahOf(k) ? verses[keys[j]!]!.en : '');
    return [near(i - 1), verses[k]!.en, near(i + 1)].filter(Boolean).join(' ');
  });
}

/** What text each verse vector is made from: the verse alone, or the verse with its neighbours. */
export type VerseText = 'verse' | 'window';

/**
 * Float vectors of every verse's English text (one per key, in Quran order), from the cache
 * or freshly embedded (2 to 4 minutes per model on a laptop CPU; longer for windows).
 */
export async function rawVerseVectors(
  spec: ModelSpec,
  verses: Verses,
  text: VerseText = 'verse',
): Promise<{ keys: VerseKey[]; vectors: Float32Array[] }> {
  const keys = Object.keys(verses) as VerseKey[];
  const suffix = text === 'window' ? '.window' : '';
  const file = `${CACHE}/${spec.id.replace('/', '__')}@${spec.revision.slice(0, 7)}${suffix}.f32`;
  if (!existsSync(file)) {
    const embedder = await nodeEmbedder(spec);
    const started = Date.now();
    const vectors = await embedder.embed(
      text === 'window' ? windowTexts(keys, verses) : keys.map((k) => verses[k]!.en),
      'passage',
    );
    console.log(`  embedded ${keys.length} verses in ${((Date.now() - started) / 1000).toFixed(0)} s`);
    const flat = new Float32Array(vectors.length * vectors[0]!.length);
    vectors.forEach((v, i) => flat.set(v, i * v.length));
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, new Uint8Array(flat.buffer));
  }
  const buf = readFileSync(file);
  const flat = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const dims = flat.length / keys.length;
  if (!Number.isInteger(dims)) throw new Error(`${file} does not fit ${keys.length} verses; delete it`);
  return { keys, vectors: keys.map((_, i) => flat.subarray(i * dims, (i + 1) * dims)) };
}
