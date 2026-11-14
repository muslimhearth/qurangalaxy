import { describe, expect, it } from 'vitest';
import { fixtureOccurrences } from '../data/fixture';
import type { Occurrences } from '../data/types';
import { rootsInVerse } from './verseRoots';

describe('rootsInVerse', () => {
  it('lists the roots of a verse in word order', () => {
    // Fixture 1:2: root 3 at word 1, root 1 at word 2, root 4 at 3, root 5 at 4.
    expect(rootsInVerse(fixtureOccurrences, '1:2')).toEqual([3, 1, 4, 5]);
  });

  it('is empty for a verse with no roots', () => {
    expect(rootsInVerse(fixtureOccurrences, '1:7')).toEqual([]);
  });

  it('builds its lookup once per occurrences object', () => {
    const occ: Occurrences = [[{ v: '1:1', w: [2] }], [{ v: '1:1', w: [1] }]];
    expect(rootsInVerse(occ, '1:1')).toEqual([1, 0]);
    occ[0]!.push({ v: '1:2', w: [1] });
    expect(rootsInVerse(occ, '1:2')).toEqual([]); // cached
  });
});
