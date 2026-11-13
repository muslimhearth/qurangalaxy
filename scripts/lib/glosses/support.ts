/**
 * Checks glosses against the translation: does a verse's English use the gloss's words?
 */
import { englishStem } from '../../../src/search/english';
import { tokenize } from './fallback';

/** Stemmed content words of one verse translation. */
export function verseStems(text: string): Set<string> {
  return new Set(tokenize(text).map(englishStem));
}

/** Stemmed content words of a gloss, without the infinitive "to". */
function glossStems(gloss: string): string[] {
  return tokenize(gloss)
    .filter((w) => w !== 'to')
    .map(englishStem);
}

/** Number of verses that contain every content word of `gloss`. */
export function glossSupport(gloss: string, verses: Set<string>[]): number {
  const stems = glossStems(gloss);
  if (stems.length === 0) return 0;
  return verses.filter((v) => stems.every((s) => v.has(s))).length;
}

/** Share (0..1) of verses that contain all content words of at least one of `glosses`. */
export function supportShare(glosses: string[], verses: Set<string>[]): number {
  if (verses.length === 0 || glosses.length === 0) return 0;
  const all = glosses.map(glossStems).filter((s) => s.length > 0);
  const hits = verses.filter((v) => all.some((stems) => stems.every((s) => v.has(s)))).length;
  return hits / verses.length;
}
