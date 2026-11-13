/**
 * Sentence-embedding models known to the app. Verses are embedded at build time
 * (`pnpm embeddings`) and queries in the browser, always with the same model.
 */

/** One embedding model on huggingface.co (ONNX weights from the Xenova conversions). */
export interface ModelSpec {
  /** Hugging Face repo id; also the folder name under public/models/. */
  id: string;
  /** Pinned git commit of the repo, so downloads are reproducible. */
  revision: string;
  /** How token vectors become one sentence vector. */
  pooling: 'mean' | 'cls';
  /** Text put before a search query (some retrieval models need it). */
  queryPrefix: string;
  /** Text put before each verse. */
  passagePrefix: string;
  licence: string;
}

/** Files each model needs at run time (transformers.js, q8 weights). */
export const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'onnx/model_quantized.onnx',
] as const;

/** Candidates compared by `pnpm eval:semantic`. */
export const MODELS: Record<string, ModelSpec> = {
  'Xenova/bge-small-en-v1.5': {
    id: 'Xenova/bge-small-en-v1.5',
    revision: 'ea104dacec62c0de699686887e3f920caeb4f3e3',
    pooling: 'cls',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    passagePrefix: '',
    licence: 'MIT',
  },
  'Xenova/all-MiniLM-L6-v2': {
    id: 'Xenova/all-MiniLM-L6-v2',
    revision: '751bff37182d3f1213fa05d7196b954e230abad9',
    pooling: 'mean',
    queryPrefix: '',
    passagePrefix: '',
    licence: 'Apache-2.0',
  },
  'Xenova/gte-small': {
    id: 'Xenova/gte-small',
    revision: '5927d1727bb12db490052a1b33265ad78058de08',
    pooling: 'mean',
    queryPrefix: '',
    passagePrefix: '',
    licence: 'MIT',
  },
};

/** The model the app ships with. */
export const MODEL: ModelSpec = MODELS['Xenova/bge-small-en-v1.5']!;
