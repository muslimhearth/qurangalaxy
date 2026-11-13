import type { VerseKey } from '../../src/data/types';

/** One root-bearing segment of a Quran word. */
export interface RootWord {
  verse: VerseKey;
  /** 1-based word position in the verse (corpus numbering). */
  word: number;
  /** Root letters in Arabic script. */
  root: string;
  /** Lemma of the same segment. */
  lemma: string;
}

/** Result of parsing the corpus morphology file. */
export interface Morphology {
  /** Root segments in Quran order. A word with two roots gives two entries. */
  rootWords: RootWord[];
  /** Number of words per verse, counting words with and without a root. */
  verseWordCounts: Map<VerseKey, number>;
}

/**
 * Parses the Quranic Arabic Corpus morphology file
 * (tab-separated: `s:a:w:segment`, form, tag, features joined by `|`).
 */
export function parseMorphology(text: string): Morphology {
  const rootWords: RootWord[] = [];
  const verseWordCounts = new Map<VerseKey, number>();
  text.split('\n').forEach((line, i) => {
    if (line.trim() === '') return;
    const [location, , , features] = line.split('\t');
    const parts = location?.split(':').map(Number);
    if (features === undefined || parts?.length !== 4 || parts.some(Number.isNaN)) {
      throw new Error(`Malformed morphology line ${i + 1}: ${line.slice(0, 60)}`);
    }
    const [surah, ayah, word] = parts as [number, number, number];
    const verse: VerseKey = `${surah}:${ayah}`;
    // Words are numbered 1..n in order, so the highest number is the word count.
    verseWordCounts.set(verse, Math.max(verseWordCounts.get(verse) ?? 0, word));

    const tags = features.split('|');
    const root = tags.find((t) => t.startsWith('ROOT:'))?.slice(5);
    if (root === undefined) return;
    const lemma = tags.find((t) => t.startsWith('LEM:'))?.slice(4) ?? '';
    rootWords.push({ verse, word, root, lemma });
  });
  return { rootWords, verseWordCounts };
}
