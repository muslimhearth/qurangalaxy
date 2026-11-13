/// <reference lib="webworker" />
/**
 * Web Worker that runs the embedding model off the main thread. It loads the model on the
 * first message, from our own server: model files from `<base>/models/`, the ONNX runtime
 * wasm from the app's own assets. No request goes to huggingface.co or a CDN.
 */
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import { MODEL } from './models';
import { createPipelineEmbedder } from './pipelineEmbedder';
import { createWorkerHandler, type ToMain, type ToWorker } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

const handle = createWorkerHandler(
  (onProgress) =>
    createPipelineEmbedder(MODEL, {
      modelPath: `${import.meta.env.BASE_URL}models/`,
      // The plain (non-WebGPU) runtime build: the smallest wasm, enough for a 33 MB model.
      wasmPaths: { wasm, mjs },
      device: 'wasm',
      onProgress,
    }),
  (msg: ToMain) => self.postMessage(msg),
);

self.addEventListener('message', (e: MessageEvent<ToWorker>) => void handle(e.data));
