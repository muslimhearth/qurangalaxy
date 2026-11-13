/**
 * The real `Embedder`: a transformers.js feature-extraction pipeline that reads the model
 * only from our own server (or disk in Node), never from huggingface.co.
 * Used by the Web Worker and by the Node scripts; unit tests use a fake embedder instead.
 */
import type { Embedder, ProgressListener } from './embedder';
import type { ModelSpec } from './models';

/** Where the model and the ONNX runtime come from. */
export interface PipelineOptions {
  /**
   * Where `<model id>/…` lives: a disk folder in Node ("public/models/") or an absolute
   * same-origin URL in the browser ("https://our.site/models/").
   */
  modelPath: string;
  /** ONNX runtime wasm files (browser only); without them transformers.js uses a CDN. */
  wasmPaths?: { mjs: string; wasm: string };
  /** Device: "wasm" in the browser, "cpu" in Node. */
  device: 'wasm' | 'cpu';
  onProgress?: ProgressListener;
}

/** Texts embedded per model call; keeps memory flat for the 6,236-verse build. */
const BATCH = 32;

/** Loads the model and returns an embedder for it. */
export async function createPipelineEmbedder(spec: ModelSpec, opts: PipelineOptions): Promise<Embedder> {
  // Dynamic import: transformers.js and the ONNX runtime stay out of every chunk but the worker's.
  const { env, pipeline } = await import('@huggingface/transformers');
  if (/^https?:\/\//.test(opts.modelPath)) {
    // Browser: our own server acts as the model "hub". In this mode transformers.js probes
    // file sizes with a 1-byte Range request; its local-path mode fetches each file twice.
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteHost = opts.modelPath;
    env.remotePathTemplate = '{model}/';
  } else {
    // Node: read from disk only.
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = opts.modelPath;
  }
  if (opts.wasmPaths && env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = opts.wasmPaths;

  const extractor = await pipeline('feature-extraction', spec.id, {
    dtype: 'q8',
    device: opts.device,
    progress_callback: (p) => {
      if (p.status === 'progress_total' && p.total > 0) opts.onProgress?.(p.loaded / p.total);
    },
  });

  return {
    async embed(texts, kind) {
      const prefix = kind === 'query' ? spec.queryPrefix : spec.passagePrefix;
      const out: Float32Array[] = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH).map((t) => prefix + t);
        const tensor = await extractor(batch, { pooling: spec.pooling, normalize: true });
        const dims = tensor.dims[1]!;
        const data = tensor.data as Float32Array;
        for (let r = 0; r < batch.length; r++) out.push(data.slice(r * dims, (r + 1) * dims));
      }
      return out;
    },
  };
}
