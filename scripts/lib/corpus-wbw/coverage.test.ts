import { describe, expect, it } from 'vitest';
import { completeVerses, groupByVerse, nextUncovered, pageUrl } from './coverage';
import type { WbwWord } from './parse';

const w = (location: string): WbwWord => ({ location, translit: '', gloss: 'x' });
const counts = new Map([
  ['1:1', 2],
  ['1:2', 3],
  ['1:3', 1],
]);

describe('groupByVerse', () => {
  it('groups words by their verse key in page order', () => {
    const groups = groupByVerse([w('1:1:1'), w('1:1:2'), w('1:2:1')]);
    expect([...groups.keys()]).toEqual(['1:1', '1:2']);
    expect(groups.get('1:1')?.map((x) => x.location)).toEqual(['1:1:1', '1:1:2']);
  });
});

describe('completeVerses', () => {
  it('returns verses whose word count matches the morphology', () => {
    const words = [w('1:1:1'), w('1:1:2'), w('1:2:1'), w('1:2:2')];
    expect(completeVerses(words, counts)).toEqual(['1:1']);
  });

  it('ignores verses unknown to the morphology', () => {
    expect(completeVerses([w('9:999:1')], counts)).toEqual([]);
  });
});

describe('nextUncovered', () => {
  it('returns the first verse in Quran order that is not covered', () => {
    expect(nextUncovered(['1:1', '1:2', '1:3'], new Set(['1:1', '1:3']))).toBe('1:2');
  });

  it('returns undefined when all verses are covered', () => {
    expect(nextUncovered(['1:1'], new Set(['1:1']))).toBeUndefined();
  });
});

describe('pageUrl', () => {
  it('builds the corpus word-by-word URL for a verse', () => {
    expect(pageUrl('2:255')).toBe('https://corpus.quran.com/wordbyword.jsp?chapter=2&verse=255');
  });
});
