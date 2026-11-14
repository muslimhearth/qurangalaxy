import { describe, expect, it } from 'vitest';
import { fixtureOccurrences, fixtureVerses } from '../data/fixture';
import type { Occurrences, Verses } from '../data/types';
import { buildWordForms, exactForms, indexWordForms, prefixForms } from './wordForms';

// First words of Tanzil Uthmani verses (cut for the test) with hand-placed roots.
const verses: Verses = {
  '2:189': { ar: 'يَسْـَٔلُونَكَ عَنِ ٱلْأَهِلَّةِ قُلْ هِىَ', en: '' },
  '2:190': { ar: 'وَقَٰتِلُوا۟ فِى سَبِيلِ ٱللَّهِ', en: '' },
  '2:215': { ar: 'يَسْـَٔلُونَكَ مَاذَا يُنفِقُونَ قُلْ', en: '' },
};
// Root 0 = سأل, root 1 = هلل, root 2 = قول. Positions count words split on spaces.
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
];

describe('buildWordForms', () => {
  it('maps the key of each Quran word to its roots, counts and Uthmani form', () => {
    const file = buildWordForms(verses, occurrences);
    expect(file.version).toBe(1);
    expect(file.forms['يسلونك']).toEqual([[0, 2, 'يَسْـَٔلُونَكَ']]);
    expect(file.forms['قل']).toEqual([[2, 2, 'قُلْ']]);
    expect(file.forms['لهله']).toEqual([[1, 1, 'ٱلْأَهِلَّةِ']]);
    // Words without a root are not indexed.
    expect(file.forms['عن']).toBeUndefined();
  });

  it('orders keys, and roots of one key by count', () => {
    const file = buildWordForms(fixtureVerses, fixtureOccurrences);
    const keys = Object.keys(file.forms);
    expect(keys).toEqual([...keys].sort());
  });
});

describe('exactForms and prefixForms', () => {
  const index = indexWordForms(buildWordForms(verses, occurrences));

  it('finds the roots of a typed word', () => {
    expect(exactForms(index, 'يسالونك')).toEqual([{ id: 0, count: 2, surface: 'يَسْـَٔلُونَكَ' }]);
    expect(exactForms(index, 'يسألونك')).toEqual(exactForms(index, 'يسالونك'));
    expect(exactForms(index, 'كتاب')).toEqual([]);
  });

  it('tries one lam or yaa less when the typed word has none: Uthmani writes ٱلَّيْل, plain text الليل', () => {
    const night = indexWordForms(
      buildWordForms({ '17:12': { ar: 'وَجَعَلْنَا ٱلَّيْلَ', en: '' } }, [[{ v: '17:12', w: [2] }]]),
    );
    expect(exactForms(night, 'الليل')).toEqual([{ id: 0, count: 1, surface: 'ٱلَّيْلَ' }]);
    expect(exactForms(night, 'والليل')).toEqual([]);
  });

  it('finds roots of words that start with the typed letters, summed per root', () => {
    expect(prefixForms(index, 'يسلو')).toEqual([{ id: 0, count: 2, surface: 'يَسْـَٔلُونَكَ' }]);
    expect(prefixForms(index, 'ق')).toEqual([{ id: 2, count: 2, surface: 'قُلْ' }]);
    expect(prefixForms(index, 'ز')).toEqual([]);
  });
});
