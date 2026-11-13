import { describe, expect, it, vi } from 'vitest';
import type { EmbeddingsMeta, Occurrences } from '../data/types';
import { createSemanticService } from './service';
import { buildIndex } from './verseIndex';

const meta: EmbeddingsMeta = { model: 'm', dims: 2, encoding: 'int8', scale: 100, keys: ['1:1', '1:2', '1:3'] };
const occurrences: Occurrences = [[{ v: '1:1', w: [1] }], [{ v: '1:2', w: [1] }], [{ v: '1:3', w: [1] }]];
const index = buildIndex(meta, new Int8Array([100, 0, 0, 100, 0, 100]), occurrences);

/** Fake model: "east" points along x, anything else along y. */
const embedder = {
  ready: vi.fn(async () => {}),
  embed: async (texts: string[]) => texts.map((t) => new Float32Array(t === 'east' ? [1, 0] : [0, 1])),
};

describe('createSemanticService', () => {
  it('embeds the query and searches the index', async () => {
    const service = createSemanticService(embedder, async () => index);
    const matches = await service.search('east');
    expect(matches[0]).toMatchObject({ id: 0, verses: ['1:1'], reason: { kind: 'semantic', text: 'east' } });
  });

  it('warms up by loading the model and the index', async () => {
    const loadIndex = vi.fn(async () => index);
    await createSemanticService(embedder, loadIndex).warm();
    expect(embedder.ready).toHaveBeenCalled();
    expect(loadIndex).toHaveBeenCalled();
  });
});
