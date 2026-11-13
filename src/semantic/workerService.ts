/** The app's one semantic service, backed by the embedding Web Worker. */
import type { ProgressListener } from './embedder';
import { loadSemanticIndex } from './loadIndex';
import { WorkerEmbedder } from './protocol';
import { createSemanticService, type SemanticService } from './service';

let service: SemanticService | null = null;
const listeners = new Set<ProgressListener>();

/** Subscribes to model download progress (0..1); returns an unsubscribe function. */
export function onModelProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Creates the worker on first use. Nothing loads until `warm` or `search` is called. */
export function getWorkerService(): SemanticService {
  if (!service) {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const embedder = new WorkerEmbedder(worker, (f) => listeners.forEach((l) => l(f)));
    service = createSemanticService(embedder, loadSemanticIndex);
  }
  return service;
}
