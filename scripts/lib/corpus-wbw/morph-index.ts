/** What the morphology file says about one whole word (all its segments). */
export interface MorphWord {
  /** Lemma of the main segment: the root segment, else the first non-prefix segment with a lemma. */
  lemma: string | undefined;
  /** Root of the main segment, if any. */
  root: string | undefined;
  /** True when the main segment is a proper noun (tag `PN`). */
  properNoun: boolean;
  /** True when the word has a prefixed preposition (bi, li, ka, ...). */
  prepPrefix: boolean;
  /** True when the word has a suffixed pronoun. */
  pronSuffix: boolean;
}

/** Word-level index of the corpus morphology file. */
export interface MorphIndex {
  /** Verse keys `chapter:verse` in Quran order. */
  verses: string[];
  /** Number of words per verse. */
  verseWordCounts: Map<string, number>;
  /** Word info by location `chapter:verse:word`. */
  words: Map<string, MorphWord>;
}

interface Segment {
  tags: string[];
}

const feature = (tags: string[], prefix: string) => tags.find((t) => t.startsWith(prefix))?.slice(prefix.length);

/** Combines the segments of one word into its word-level info. */
function toWord(segments: Segment[]): MorphWord {
  const isPrefix = (s: Segment) => s.tags.includes('PREF');
  const main =
    segments.find((s) => feature(s.tags, 'ROOT:') !== undefined) ??
    segments.find((s) => !isPrefix(s) && feature(s.tags, 'LEM:') !== undefined);
  return {
    lemma: main && feature(main.tags, 'LEM:'),
    root: main && feature(main.tags, 'ROOT:'),
    properNoun: main?.tags.includes('PN') ?? false,
    prepPrefix: segments.some((s) => isPrefix(s) && s.tags[0] === 'P'),
    pronSuffix: segments.some((s) => s.tags.includes('SUFF') && s.tags.includes('PRON')),
  };
}

/**
 * Indexes the corpus morphology file (`c:v:w:s`, form, tag, features) by word.
 * Verse order follows the file, which is in Quran order.
 */
export function indexMorphology(text: string): MorphIndex {
  const verses: string[] = [];
  const verseWordCounts = new Map<string, number>();
  const segmentsByWord = new Map<string, Segment[]>();
  text.split('\n').forEach((line, i) => {
    if (line.trim() === '') return;
    const [location, , , features] = line.split('\t');
    const parts = location?.split(':') ?? [];
    if (features === undefined || parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) {
      throw new Error(`Malformed morphology line ${i + 1}: ${line.slice(0, 60)}`);
    }
    const [c, v, w] = parts;
    const verse = `${c}:${v}`;
    if (!verseWordCounts.has(verse)) verses.push(verse);
    verseWordCounts.set(verse, Math.max(verseWordCounts.get(verse) ?? 0, Number(w)));
    const key = `${verse}:${w}`;
    const list = segmentsByWord.get(key) ?? [];
    list.push({ tags: features.split('|') });
    segmentsByWord.set(key, list);
  });
  const words = new Map<string, MorphWord>();
  for (const [key, segments] of segmentsByWord) words.set(key, toWord(segments));
  return { verses, verseWordCounts, words };
}
