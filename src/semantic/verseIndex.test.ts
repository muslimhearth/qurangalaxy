import { describe, expect, it } from 'vitest';
import type { EmbeddingsMeta, Occurrences } from '../data/types';
import { buildIndex, searchIndex, searchVerses } from './verseIndex';

// Four verses in 2D at scale 100: two point along x, one along y, one diagonal.
const meta: EmbeddingsMeta = { model: 'm', dims: 2, encoding: 'int8', scale: 100, keys: ['1:1', '1:2', '1:3', '1:4'] };
const matrix = new Int8Array([100, 0, 99, 14, 0, 100, 71, 71]);
const occurrences: Occurrences = [
  [{ v: '1:1', w: [1] }, { v: '1:2', w: [1] }, { v: '1:3', w: [1] }, { v: '1:4', w: [1] }], // everywhere
  [{ v: '1:1', w: [2] }, { v: '1:2', w: [2] }], // the "x" root
  [{ v: '1:3', w: [2] }], // the "y" root
];

describe('searchIndex', () => {
  const index = buildIndex(meta, matrix, occurrences);

  it('finds the root of the verses closest to the query', () => {
    const matches = searchIndex(index, new Float32Array([1, 0]), 'east');
    expect(matches[0]).toMatchObject({ id: 1, score: 1, verses: ['1:1', '1:2'], reason: { kind: 'semantic', text: 'east' } });
  });

  it('finds the other root for the other direction', () => {
    expect(searchIndex(index, new Float32Array([0, 1]), 'north')[0]!.id).toBe(2);
  });

  it('never returns a root found in every verse', () => {
    const ids = searchIndex(index, new Float32Array([0.7, 0.7]), 'q').map((m) => m.id);
    expect(ids).not.toContain(0);
  });

  it('looks only at the top verses', () => {
    const ids = searchIndex(index, new Float32Array([1, 0]), 'q', { topVerses: 1 }).map((m) => m.id);
    expect(ids).toEqual([1]);
  });

  it('rejects a matrix that does not fit the keys', () => {
    expect(() => buildIndex(meta, new Int8Array(3), occurrences)).toThrow(/size/);
  });
});

describe('searchVerses', () => {
  const index = buildIndex(meta, matrix, occurrences);

  it('returns the closest verses with their similarity, best first', () => {
    const hits = searchVerses(index, new Float32Array([1, 0]), 2);
    expect(hits.map((h) => h.key)).toEqual(['1:1', '1:2']);
    expect(hits[0]!.sim).toBeCloseTo(1);
    expect(hits[1]!.sim).toBeCloseTo(0.99);
  });

  it('drops verses with no similarity', () => {
    expect(searchVerses(index, new Float32Array([0, -1]), 4).every((h) => h.sim > 0)).toBe(true);
  });
});
