import { describe, expect, it } from 'vitest';
import type { Occurrence, Verses } from '../data/types';
import { particleOccurrences, sameForm, wordTotal, type WordStarts } from './counts';

const VERSES = { '1:1': { ar: 'قَالَ قَالُوٓا۟ قَالُوٓا۟', en: '' }, '1:2': { ar: 'قَالُوا قَوْلٌ', en: '' } } as Verses;
const ROOT: Occurrence[] = [
  { v: '1:1', w: [1, 2, 3] },
  { v: '1:2', w: [1, 2] },
];

describe('sameForm', () => {
  it('keeps only words with the exact Tanzil spelling', () => {
    expect(sameForm(ROOT, VERSES, 'قَالُوٓا۟')).toEqual([{ v: '1:1', w: [2, 3] }]);
  });
});

describe('wordTotal', () => {
  it('counts words, not verses', () => {
    expect(wordTotal(ROOT)).toBe(5);
  });
});

describe('particleOccurrences', () => {
  it('turns delta-coded global word indices into verse positions', () => {
    const table: WordStarts = { keys: ['1:1', '1:2', '1:3'], starts: [0, 3, 5] };
    // Global words 1, 2, 5, 7 → 1:1 words 2-3, 1:3 words 1 and 3.
    expect(particleOccurrences([1, 1, 3, 2], table)).toEqual([
      { v: '1:1', w: [2, 3] },
      { v: '1:3', w: [1, 3] },
    ]);
  });
});
