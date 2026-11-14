import { describe, expect, it } from 'vitest';
import type { Galaxy, Occurrences, Verses } from '../../src/data/types';
import { validateData } from './validate';

const root = (id: number) => ({
  id,
  ar: 'رحم',
  tr: 'r-ḥ-m',
  en: [],
  count: 1,
  verseCount: 1,
  lemmas: [],
  pos: [0, 0, 0] as [number, number, number],
  cluster: 0,
});

function sample() {
  const galaxy: Galaxy = {
    version: 1,
    roots: [root(0), root(1)],
    edges: [{ source: 0, target: 1, weight: 1, score: 0 }],
    clusterCount: 1,
  };
  const occurrences: Occurrences = [[{ v: '1:1', w: [2] }], [{ v: '1:1', w: [1] }]];
  const verses: Verses = { '1:1': { ar: 'a b', en: 'x' } };
  return { galaxy, occurrences, verses };
}

describe('validateData', () => {
  it('accepts consistent data', () => {
    const { galaxy, occurrences, verses } = sample();
    expect(validateData(galaxy, occurrences, verses)).toEqual([]);
  });

  it('reports ids that are not indices', () => {
    const { galaxy, occurrences, verses } = sample();
    galaxy.roots[1]!.id = 5;
    expect(validateData(galaxy, occurrences, verses)).toEqual(['root 1 has id 5']);
  });

  it('reports occurrences of unknown verses and out-of-range words', () => {
    const { galaxy, occurrences, verses } = sample();
    occurrences[0] = [{ v: '9:9', w: [1] }];
    occurrences[1] = [{ v: '1:1', w: [3] }];
    expect(validateData(galaxy, occurrences, verses)).toEqual([
      'root 0: verse 9:9 not in verses',
      'root 1: word 3 out of range in 1:1 (2 words)',
    ]);
  });

  it('reports bad edges and a wrong occurrence list length', () => {
    const { galaxy, occurrences, verses } = sample();
    galaxy.edges = [{ source: 1, target: 0, weight: 1, score: 0 }, { source: 0, target: 7, weight: 1, score: 0 }];
    occurrences.pop();
    expect(validateData(galaxy, occurrences, verses)).toEqual([
      'occurrences has 1 lists for 2 roots',
      'edge 0: bad ids 1-0',
      'edge 1: bad ids 0-7',
    ]);
  });

  it('reports clusters outside 0..clusterCount-1', () => {
    const { galaxy, occurrences, verses } = sample();
    galaxy.roots[0]!.cluster = 1;
    expect(validateData(galaxy, occurrences, verses)).toEqual(['root 0 has cluster 1']);
  });
});
