import type { WbwWord } from './parse';

/** Verse key `chapter:verse` of a word location `chapter:verse:word`. */
export const verseOf = (location: string): string => location.slice(0, location.lastIndexOf(':'));

/** Groups words by verse key, keeping page order. */
export function groupByVerse(words: WbwWord[]): Map<string, WbwWord[]> {
  const groups = new Map<string, WbwWord[]>();
  for (const word of words) {
    const key = verseOf(word.location);
    const list = groups.get(key) ?? [];
    list.push(word);
    groups.set(key, list);
  }
  return groups;
}

/**
 * Returns the verses of a page that are complete: as many words as the morphology says.
 * A page shows several verses, and the last one may be cut short, so only these count as done.
 */
export function completeVerses(words: WbwWord[], verseWordCounts: Map<string, number>): string[] {
  return [...groupByVerse(words)]
    .filter(([verse, list]) => verseWordCounts.get(verse) === list.length)
    .map(([verse]) => verse);
}

/** First verse in `verses` (Quran order) that is not in `covered`, or undefined when all are. */
export function nextUncovered(verses: string[], covered: Set<string>): string | undefined {
  return verses.find((v) => !covered.has(v));
}

/** Corpus word-by-word page URL that starts at the given verse. */
export function pageUrl(verse: string): string {
  const [chapter, ayah] = verse.split(':');
  return `https://corpus.quran.com/wordbyword.jsp?chapter=${chapter}&verse=${ayah}`;
}
