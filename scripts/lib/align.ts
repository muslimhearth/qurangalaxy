import type { VerseKey } from '../../src/data/types';

/** A verse where the Tanzil word count differs from the corpus word count. */
export interface Mismatch {
  verse: VerseKey;
  /** Words in the Tanzil text (split on single spaces); 0 if the verse is missing. */
  text: number;
  /** Words in the corpus; 0 if the verse is missing. */
  corpus: number;
}

/** Compares word counts of cleaned Tanzil texts with corpus word counts, verse by verse. */
export function findMismatches(
  texts: Map<VerseKey, string>,
  corpusCounts: Map<VerseKey, number>,
): Mismatch[] {
  const keys = new Set([...texts.keys(), ...corpusCounts.keys()]);
  const mismatches: Mismatch[] = [];
  for (const verse of keys) {
    const t = texts.get(verse);
    const text = t === undefined ? 0 : t.split(' ').length;
    const corpus = corpusCounts.get(verse) ?? 0;
    if (text !== corpus) mismatches.push({ verse, text, corpus });
  }
  return mismatches;
}
