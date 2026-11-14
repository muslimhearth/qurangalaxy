import type { VerseKey } from '../../../src/data/types';

/**
 * Corpus words whose letters differ from Tanzil beyond the known spelling conventions
 * (verse:word in Corpus numbering). The Corpus writes يَٰصَىٰحِبَىِ, Tanzil يَٰصَٰحِبَىِ.
 */
export const SPELLING_EXCEPTIONS: ReadonlySet<string> = new Set(['12:39:1', '12:41:1']);

/**
 * A comparison key for one word: the Corpus and Tanzil write some marks differently.
 * - Hamza: Corpus ءَا, Tanzil ـَٔا (tatweel + hamza above): both are dropped.
 * - Small yeh: Corpus ۦ (U+06E6), Tanzil ـۧ (U+06E7 after a tatweel).
 * - Spaces: the Corpus joins some two-word spellings (بَعْدَمَا = بَعْدَ مَا).
 */
export function spellingKey(text: string): string {
  return text.replace(/[ـٔء ]/g, '').replace(/ۧ/g, 'ۦ');
}

/**
 * True when the Corpus segments of word `word` in `verse` spell the Tanzil text `tanzil`
 * (one Tanzil word, or two joined by a space where the Corpus joins them).
 */
export function matchesTanzil(verse: VerseKey, word: number, segments: string[], tanzil: string): boolean {
  if (SPELLING_EXCEPTIONS.has(`${verse}:${word}`)) return true;
  return spellingKey(segments.join('')) === spellingKey(tanzil);
}
