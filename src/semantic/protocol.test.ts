import { describe, expect, it, vi } from 'vitest';
import type { Embedder, ProgressListener } from './embedder';
import { createWorkerHandler, WorkerEmbedder, type ToMain, type ToWorker, type WorkerLike } from './protocol';

const fakeEmbedder: Embedder = {
  embed: async (texts) => texts.map((t) => new Float32Array([t.length, 0])),
};

/** Joins a handler and a client in memory, like a real worker would. */
function connect(load: (p: ProgressListener) => Promise<Embedder>) {
  const fromWorker: ((e: MessageEvent<ToMain>) => void)[] = [];
  const handler = createWorkerHandler(load, (msg) => {
    for (const l of fromWorker) l({ data: msg } as MessageEvent<ToMain>);
  });
  const worker: WorkerLike = {
    postMessage: (msg: ToWorker) => void handler(msg),
    addEventListener: (_type, l) => fromWorker.push(l),
  };
  return worker;
}

describe('worker protocol', () => {
  it('loads the model once and embeds texts', async () => {
    const load = vi.fn(async () => fakeEmbedder);
    const client = new WorkerEmbedder(connect(load));
    const [a] = await client.embed(['abc'], 'query');
    const [b] = await client.embed(['de'], 'query');
    expect([...a!]).toEqual([3, 0]);
    expect([...b!]).toEqual([2, 0]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports load progress', async () => {
    const seen: number[] = [];
    const client = new WorkerEmbedder(
      connect(async (p) => {
        p(0.5);
        p(1);
        return fakeEmbedder;
      }),
      (f) => seen.push(f),
    );
    await client.ready();
    expect(seen).toEqual([0.5, 1]);
  });

  it('rejects when the model cannot load, and can retry', async () => {
    let fail = true;
    const client = new WorkerEmbedder(
      connect(async () => {
        if (fail) throw new Error('no model');
        return fakeEmbedder;
      }),
    );
    await expect(client.ready()).rejects.toThrow('no model');
    fail = false;
    await expect(client.embed(['x'], 'query')).resolves.toHaveLength(1);
  });
});
