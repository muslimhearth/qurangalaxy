import type { Galaxy, Occurrences, Verses } from './types';
import type { LemmaIndex } from './lemmaIndex';

/**
 * Small hand-made dataset for tests and for UI/scene work before the real data exists.
 * Arabic text is from Tanzil (Al-Fatiha 1:1-1:4). English strings (verse text and
 * meanings) are placeholders, not a translation.
 */
export const fixtureGalaxy: Galaxy = {
  version: 1,
  clusterCount: 2,
  roots: [
    { id: 0, ar: 'سمو', tr: 's-m-w', en: ['name', 'sky'], count: 381, verseCount: 360, lemmas: [{ ar: 'اسْم', count: 22, en: ['name'] }, { ar: 'سَمَآء', count: 310, en: ['sky', 'heaven'] }], pos: [0, 0, 0], cluster: 0 },
    { id: 1, ar: 'أله', tr: 'ʾ-l-h', en: ['god'], count: 2851, verseCount: 2153, lemmas: [{ ar: 'اللَّه', count: 2699, en: ['God'] }, { ar: 'إِلٰه', count: 147, en: ['god', 'deity'] }], pos: [12, 4, -3], cluster: 0 },
    { id: 2, ar: 'رحم', tr: 'r-ḥ-m', en: ['mercy'], count: 339, verseCount: 300, lemmas: [{ ar: 'رَحِيم', count: 115, en: ['merciful'] }, { ar: 'رَحْمٰن', count: 57, en: ['most merciful'] }], pos: [-8, 10, 5], cluster: 1 },
    { id: 3, ar: 'حمد', tr: 'ḥ-m-d', en: ['praise'], count: 68, verseCount: 63, lemmas: [{ ar: 'حَمْد', count: 43, en: ['praise'] }], pos: [6, -11, 8], cluster: 1 },
    { id: 4, ar: 'ربب', tr: 'r-b-b', en: ['lord'], count: 980, verseCount: 870, lemmas: [{ ar: 'رَبّ', count: 975, en: ['lord'] }], pos: [-14, -5, -9], cluster: 0 },
    { id: 5, ar: 'علم', tr: 'ʿ-l-m', en: ['knowledge'], count: 854, verseCount: 700, lemmas: [{ ar: 'عَلِيم', count: 162, en: ['all-knowing'] }, { ar: 'عَٰلَمِين', count: 73, en: ['worlds'] }], pos: [3, 15, -12], cluster: 1 },
  ],
  edges: [
    { source: 0, target: 1, weight: 3, score: 1.2 },
    { source: 0, target: 2, weight: 2, score: 4.5 },
    { source: 1, target: 2, weight: 3, score: 0.9 },
    { source: 1, target: 4, weight: 1, score: 0.3 },
    { source: 3, target: 4, weight: 1, score: 2.1 },
    { source: 4, target: 5, weight: 1, score: 0.5 },
  ],
};

export const fixtureOccurrences: Occurrences = [
  [{ v: '1:1', w: [1] }],
  [{ v: '1:1', w: [2] }, { v: '1:2', w: [2] }],
  [{ v: '1:1', w: [3, 4] }, { v: '1:3', w: [1, 2] }],
  [{ v: '1:2', w: [1] }],
  [{ v: '1:2', w: [3] }],
  [{ v: '1:2', w: [4] }],
];

/** Lemma index of `fixtureOccurrences`: for رحم, words 3 and 4 of 1:1 are رَحْمٰن (1) and رَحِيم (0). */
export const fixtureLemmaIndex: LemmaIndex = [[0], [0, 0], [1, 0, 1, 0], [0], [0], [1]];

export const fixtureVerses: Verses = {
  '1:1': { ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', en: 'Fixture translation of 1:1' },
  '1:2': { ar: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', en: 'Fixture translation of 1:2' },
  '1:3': { ar: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', en: 'Fixture translation of 1:3' },
  '1:4': { ar: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', en: 'Fixture translation of 1:4' },
};
