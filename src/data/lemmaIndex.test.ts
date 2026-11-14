import { describe, expect, it } from 'vitest';
import { lemmaOccurrences } from './lemmaIndex';
import type { Occurrence } from './types';

const occ: Occurrence[] = [
  { v: '1:1', w: [3, 4] },
  { v: '1:3', w: [1, 2] },
  { v: '2:5', w: [7] },
];
// Lemma per word, in the same order: 1:1 → [1, 0], 1:3 → [1, 0], 2:5 → [1].
const flat = [1, 0, 1, 0, 1];

describe('lemmaOccurrences', () => {
  it('keeps the verses with the lemma and only that lemma’s words', () => {
    expect(lemmaOccurrences(occ, flat, 0)).toEqual([
      { v: '1:1', w: [4] },
      { v: '1:3', w: [2] },
    ]);
    expect(lemmaOccurrences(occ, flat, 1)).toEqual([
      { v: '1:1', w: [3] },
      { v: '1:3', w: [1] },
      { v: '2:5', w: [7] },
    ]);
  });

  it('returns nothing for an unknown lemma', () => {
    expect(lemmaOccurrences(occ, flat, 5)).toEqual([]);
  });
});
