import { describe, expect, it } from 'vitest';
import { aggregateRoots } from './aggregate';
import type { RootWord } from './morphology';

const w = (verse: `${number}:${number}`, word: number, root: string, lemma: string): RootWord => ({
  verse,
  word,
  root,
  lemma,
});

describe('aggregateRoots', () => {
  const words = [
    w('1:1', 1, 'سمو', 'اسْم'),
    w('1:1', 2, 'أله', 'اللَّه'),
    w('1:1', 3, 'رحم', 'رَحْمٰن'),
    w('1:1', 4, 'رحم', 'رَحِيم'),
    w('1:3', 1, 'رحم', 'رَحْمٰن'),
    w('2:1', 5, 'أله', 'اللَّه'),
  ];
  const { roots, occurrences } = aggregateRoots(words);

  it('orders roots by count desc, then by Arabic string, and ids are indices', () => {
    expect(roots.map((r) => r.ar)).toEqual(['رحم', 'أله', 'سمو']);
    expect(roots.map((r) => r.id)).toEqual([0, 1, 2]);
  });

  it('counts words and distinct verses per root', () => {
    expect(roots[0]).toMatchObject({ count: 3, verseCount: 2 });
    expect(roots[1]).toMatchObject({ count: 2, verseCount: 2 });
  });

  it('sorts lemmas by count, highest first', () => {
    expect(roots[0]!.lemmas).toEqual([
      { ar: 'رَحْمٰن', count: 2 },
      { ar: 'رَحِيم', count: 1 },
    ]);
  });

  it('lists occurrences per root in Quran order with word positions', () => {
    expect(occurrences[0]).toEqual([
      { v: '1:1', w: [3, 4] },
      { v: '1:3', w: [1] },
    ]);
    expect(occurrences[1]).toEqual([
      { v: '1:1', w: [2] },
      { v: '2:1', w: [5] },
    ]);
  });

  it('breaks count ties by Arabic string', () => {
    const tied = aggregateRoots([w('1:1', 1, 'ب', 'x'), w('1:1', 2, 'أ', 'y')]);
    expect(tied.roots.map((r) => r.ar)).toEqual(['أ', 'ب']);
  });
});
