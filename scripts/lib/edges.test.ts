import { describe, expect, it } from 'vitest';
import type { Occurrences } from '../../src/data/types';
import { cooccurrenceEdges } from './edges';

describe('cooccurrenceEdges', () => {
  // Root 0 in verses a,b,c; root 1 in a,b; root 2 in a; root 3 in d.
  const occ: Occurrences = [
    [{ v: '1:1', w: [1] }, { v: '1:2', w: [1] }, { v: '1:3', w: [1] }],
    [{ v: '1:1', w: [2] }, { v: '1:2', w: [2] }],
    [{ v: '1:1', w: [3] }],
    [{ v: '1:4', w: [1] }],
  ];

  it('weights each pair by shared verses, with source < target', () => {
    expect(cooccurrenceEdges(occ, 8)).toEqual([
      { source: 0, target: 1, weight: 2 },
      { source: 0, target: 2, weight: 1 },
      { source: 1, target: 2, weight: 1 },
    ]);
  });

  it('keeps the union of each root top-k edges, ties going to the lower id', () => {
    // k=1: root 0 keeps 0-1, root 1 keeps 0-1, root 2 ties 0-2/1-2 and keeps 0-2.
    expect(cooccurrenceEdges(occ, 1)).toEqual([
      { source: 0, target: 1, weight: 2 },
      { source: 0, target: 2, weight: 1 },
    ]);
  });
});
