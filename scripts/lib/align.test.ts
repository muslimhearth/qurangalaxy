import { describe, expect, it } from 'vitest';
import type { VerseKey } from '../../src/data/types';
import { findMismatches } from './align';

describe('findMismatches', () => {
  it('reports verses whose space-split word count differs from the corpus', () => {
    const texts = new Map<VerseKey, string>([
      ['1:1', 'a b c'],
      ['1:2', 'a b'],
    ]);
    const counts = new Map<VerseKey, number>([
      ['1:1', 3],
      ['1:2', 3],
    ]);
    expect(findMismatches(texts, counts)).toEqual([{ verse: '1:2', text: 2, corpus: 3 }]);
  });

  it('reports verses missing from either side with count 0', () => {
    const texts = new Map<VerseKey, string>([['1:1', 'a']]);
    const counts = new Map<VerseKey, number>([['1:2', 1]]);
    expect(findMismatches(texts, counts)).toEqual([
      { verse: '1:1', text: 1, corpus: 0 },
      { verse: '1:2', text: 0, corpus: 1 },
    ]);
  });
});
