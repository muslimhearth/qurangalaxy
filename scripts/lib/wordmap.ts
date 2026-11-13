import type { VerseKey } from '../../src/data/types';
import type { Mismatch } from './align';

/**
 * Verses where the corpus treats two Tanzil words as one, mapped to that corpus word number.
 * Tanzil writes بَعْدَ مَا and إِلْ يَاسِينَ as two words; the corpus writes one.
 * In each case the root (if any) sits in the first Tanzil word.
 */
export const JOINED_WORDS: Partial<Record<VerseKey, number>> = {
  '2:181': 3,
  '8:6': 4,
  '13:37': 8,
  '37:130': 3,
};

/** Converts a 1-based corpus word number to the 1-based word position in the Tanzil text. */
export function toTextPosition(verse: VerseKey, corpusWord: number): number {
  const joined = JOINED_WORDS[verse];
  // Words after the joined word sit one place later in Tanzil.
  return joined !== undefined && corpusWord > joined ? corpusWord + 1 : corpusWord;
}

/** Throws if a word-count mismatch is not explained by exactly one entry in JOINED_WORDS. */
export function checkJoinedWords(mismatches: Mismatch[]): void {
  for (const m of mismatches) {
    if (JOINED_WORDS[m.verse] === undefined || m.text !== m.corpus + 1) {
      throw new Error(`Unexplained word-count mismatch in ${m.verse}: Tanzil ${m.text}, corpus ${m.corpus}`);
    }
  }
}
