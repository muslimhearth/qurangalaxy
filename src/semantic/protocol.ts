/**
 * Messages between the main thread and the embedding Web Worker, plus both ends:
 * `createWorkerHandler` runs inside the worker, `WorkerEmbedder` on the main thread.
 */
import type { Embedder, ProgressListener, TextKind } from './embedder';

/** Main thread → worker. */
export type ToWorker = { type: 'load' } | { type: 'embed'; id: number; texts: string[]; kind: TextKind };

/** Worker → main thread. */
export type ToMain =
  | { type: 'progress'; fraction: number }
  | { type: 'ready' }
  | { type: 'loadError'; message: string }
  | { type: 'result'; id: number; vectors: Float32Array[] }
  | { type: 'embedError'; id: number; message: string };

/** The part of `Worker` the client uses (a fake in tests). */
export interface WorkerLike {
  postMessage(msg: ToWorker): void;
  addEventListener(type: 'message', listener: (e: MessageEvent<ToMain>) => void): void;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Worker side: loads the model on the first message (once; again after a failure)
 * and answers embed requests.
 */
export function createWorkerHandler(
  load: (onProgress: ProgressListener) => Promise<Embedder>,
  post: (msg: ToMain) => void,
): (msg: ToWorker) => Promise<void> {
  let model: Promise<Embedder> | null = null;
  const ensure = () => {
    if (!model) {
      model = load((fraction) => post({ type: 'progress', fraction }));
      model.catch(() => (model = null));
    }
    return model;
  };
  return async (msg) => {
    try {
      const embedder = await ensure();
      if (msg.type === 'load') post({ type: 'ready' });
      else {
        try {
          post({ type: 'result', id: msg.id, vectors: await embedder.embed(msg.texts, msg.kind) });
        } catch (e) {
          post({ type: 'embedError', id: msg.id, message: errorText(e) });
        }
      }
    } catch (e) {
      if (msg.type === 'load') post({ type: 'loadError', message: errorText(e) });
      else post({ type: 'embedError', id: msg.id, message: errorText(e) });
    }
  };
}

/** Main-thread `Embedder` that forwards work to the worker. */
export class WorkerEmbedder implements Embedder {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: Float32Array[]) => void; reject: (e: Error) => void }>();
  private loading: { resolve: () => void; reject: (e: Error) => void }[] = [];

  constructor(
    private worker: WorkerLike,
    onProgress?: ProgressListener,
  ) {
    worker.addEventListener('message', ({ data }) => {
      if (data.type === 'progress') onProgress?.(data.fraction);
      else if (data.type === 'ready' || data.type === 'loadError') {
        const waiting = this.loading;
        this.loading = [];
        for (const w of waiting) {
          if (data.type === 'ready') w.resolve();
          else w.reject(new Error(data.message));
        }
      } else {
        const p = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.type === 'result') p?.resolve(data.vectors);
        else p?.reject(new Error(data.message));
      }
    });
  }

  /** Starts loading the model; resolves when it is ready. */
  ready(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loading.push({ resolve, reject });
      this.worker.postMessage({ type: 'load' });
    });
  }

  embed(texts: string[], kind: TextKind): Promise<Float32Array[]> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'embed', id, texts, kind });
    });
  }
}
