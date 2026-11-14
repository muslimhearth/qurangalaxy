import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import type { Occurrences, Verses } from '../data/types';
import { exactMatches } from './exact';
import { arabicMatcher } from './basic';
import { TIER } from './types';
import { makeWordFormMatcher } from './wordFormMatcher';
import { buildWordForms, indexWordForms } from './wordForms';

// First words of Tanzil Uthmani verses (cut for the test). Roots use fixture ids:
// 2 = رحم, 3 = حمد, 4 = ربب, 5 = علم.
const verses: Verses = {
  '1:2': { ar: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', en: '' },
  '1:3': { ar: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', en: '' },
  '2:157': { ar: 'أُو۟لَٰٓئِكَ عَلَيْهِمْ صَلَوَٰتٌ مِّن رَّبِّهِمْ وَرَحْمَةٌ', en: '' },
};
const occurrences: Occurrences = [
  [],
  [],
  [
    { v: '1:3', w: [1, 2] },
    { v: '2:157', w: [6] },
  ],
  [{ v: '1:2', w: [1] }],
  [
    { v: '1:2', w: [3] },
    { v: '2:157', w: [5] },
  ],
  [{ v: '1:2', w: [4] }],
];
const roots = fixtureGalaxy.roots;
const index = indexWordForms(buildWordForms(verses, occurrences));
const matcher = makeWordFormMatcher(() => index);

describe('wordFormMatcher', () => {
  it('finds the root of an inflected Quran word, with the Quran spelling as the reason', () => {
    const [m] = matcher(roots, 'الرحمن');
    expect(m).toMatchObject({ id: 2, reason: { kind: 'arabic', text: 'ٱلرَّحْمَٰنِ' } });
    expect(m!.score).toBeGreaterThan(TIER.prefix);
    expect(m!.score).toBeLessThanOrEqual(TIER.exact);
  });

  it('matches typed text without diacritics or hamza seats', () => {
    expect(matcher(roots, 'ورحمة').map((m) => m.id)).toEqual([2]);
    expect(matcher(roots, 'العالمين').map((m) => m.id)).toEqual([5]);
  });

  it('finds roots by the start of a word while typing (3+ letters), below exact hits', () => {
    const [m] = matcher(roots, 'العال');
    expect(m).toMatchObject({ id: 5, reason: { kind: 'arabic', text: 'ٱلْعَٰلَمِينَ' } });
    expect(m!.score).toBeLessThanOrEqual(TIER.prefix);
    expect(m!.score).toBeGreaterThan(TIER.contains);
    // Two letters are too short for a prefix search.
    expect(matcher(roots, 'ال')).toEqual([]);
  });

  it('keeps the best match per root across the words of a phrase', () => {
    expect(matcher(roots, 'الحمد لله رب').map((m) => m.id).sort()).toEqual([3, 4]);
  });

  it('gives nothing for Latin text or before the index loads', () => {
    expect(matcher(roots, 'rahma')).toEqual([]);
    expect(makeWordFormMatcher(() => null)(roots, 'الرحمن')).toEqual([]);
  });

  it('lets an exact lemma keep its own reason in the combined search', () => {
    // رحمن is a lemma; on a tie the lemma matcher, which runs first, keeps its reason.
    const best = exactMatches(roots, 'رحمن', [arabicMatcher, matcher]).find((m) => m.id === 2);
    expect(best?.reason.text).toBe('رَحْمٰن');
  });
});
