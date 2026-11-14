import { describe, expect, it } from 'vitest';
import type { Occurrences, Verses, VerseKey } from '../../src/data/types';
import { buildWordForms, indexWordForms } from '../../src/search/wordForms';
import { wordFormCoverage } from './wordform-coverage';

// First words of Tanzil verses (Uthmani and Simple Clean), cut for the test.
const verses: Verses = {
  '2:189': { ar: 'يَسْـَٔلُونَكَ عَنِ ٱلْأَهِلَّةِ قُلْ', en: '' },
  '2:215': { ar: 'يَسْـَٔلُونَكَ مَاذَا يُنفِقُونَ قُلْ', en: '' },
};
const typed = new Map<VerseKey, string>([
  ['2:189', 'يسألونك عن الأهلة قل'],
  // A verse whose word count differs is skipped.
  ['2:215', 'يسألونك ماذا ينفقون'],
]);
// Root 0 = سأل, 1 = هلل, 2 = قول, 3 = نفق.
const occurrences: Occurrences = [
  [
    { v: '2:189', w: [1] },
    { v: '2:215', w: [1] },
  ],
  [{ v: '2:189', w: [3] }],
  [
    { v: '2:189', w: [4] },
    { v: '2:215', w: [4] },
  ],
  [{ v: '2:215', w: [3] }],
];

describe('wordFormCoverage', () => {
  it('counts root words whose typed form finds their root', () => {
    const index = indexWordForms(buildWordForms(verses, occurrences));
    const c = wordFormCoverage(index, verses, occurrences, typed);
    expect(c.tokens).toBe(3);
    expect(c.skipped).toBe(3);
    expect(c.top1).toBe(3);
    expect(c.found).toBe(3);
    expect(c.misses).toEqual([]);
  });
});
