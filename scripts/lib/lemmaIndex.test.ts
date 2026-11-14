import { describe, expect, it } from 'vitest';
import { buildLemmaIndex } from './lemmaIndex';
import type { RootWord } from './morphology';

const roots = [
  { ar: 'رحم', lemmas: [{ ar: 'رَحِيم' }, { ar: 'رَحْمٰن' }] },
  { ar: 'سمو', lemmas: [{ ar: 'اسْم' }] },
];

const words: RootWord[] = [
  { verse: '1:1', word: 1, root: 'سمو', lemma: 'اسْم' },
  { verse: '1:1', word: 3, root: 'رحم', lemma: 'رَحْمٰن' },
  { verse: '1:1', word: 4, root: 'رحم', lemma: 'رَحِيم' },
  // A second segment of the same word with the same root: the first one counts (as in aggregate).
  { verse: '1:1', word: 4, root: 'رحم', lemma: 'رَحْمٰن' },
  { verse: '1:3', word: 2, root: 'رحم', lemma: 'رَحِيم' },
];

describe('buildLemmaIndex', () => {
  it('gives the lemma index of each word, in occurrence order, per root', () => {
    const occurrences = [
      [{ v: '1:1' as const, w: [3, 4] }, { v: '1:3' as const, w: [2] }],
      [{ v: '1:1' as const, w: [1] }],
    ];
    expect(buildLemmaIndex(words, roots, occurrences)).toEqual([[1, 0, 0], [0]]);
  });

  it('maps corpus word numbers to Tanzil positions (joined words)', () => {
    // In 2:181 corpus word 3 is two Tanzil words, so corpus word 5 is Tanzil word 6.
    const w: RootWord[] = [{ verse: '2:181', word: 5, root: 'سمو', lemma: 'اسْم' }];
    expect(buildLemmaIndex(w, [roots[1]!], [[{ v: '2:181', w: [6] }]])).toEqual([[0]]);
  });

  it('fails when an occurrence word has no lemma', () => {
    expect(() => buildLemmaIndex(words, roots, [[{ v: '1:2', w: [1] }], []])).toThrow(/1:2/);
  });
});
