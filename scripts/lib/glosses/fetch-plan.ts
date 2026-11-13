/**
 * Decides which Wiktionary pages the gloss step needs for the corpus roots and lemmas.
 * Unidentified API clients may make only about 10 requests a minute, so the plan guesses
 * page titles from the lemma spelling (50 per request) instead of listing root categories.
 */
import { pageTitle, wiktionaryRoot } from './arabic';

/** A root with its lemmas, as far as fetching is concerned. */
export interface RootLemmas {
  ar: string;
  lemmas: { ar: string }[];
}

/** Title of the Wiktionary root appendix page, e.g. "Appendix:Arabic roots/ن و ر". */
export function appendixTitle(root: string): string {
  return `Appendix:Arabic roots/${wiktionaryRoot(root)}`;
}

/**
 * Likely page titles of one vocalized word: its plain spelling, plus variants for
 * a superscript alef written as a full ا, a final ت written as ة (the corpus spells
 * some nouns with ت) and a final ى written as ي.
 */
export function titleGuesses(word: string): string[] {
  const plain = pageTitle(word);
  const out = [plain];
  if (word.includes('ٰ')) out.push(pageTitle(word.replace(/ٰ/g, 'ا')));
  // A noun ending in "-at" (not a verb ending "-tْ" with sukun) may be a taa marbuta.
  if (/َت$/.test(word)) out.push(plain.replace(/ت$/, 'ة'));
  if (plain.endsWith('ى')) out.push(plain.replace(/ى$/, 'ي'));
  return [...new Set(out)];
}

/** Page titles to fetch for all lemmas: deduplicated, in root and lemma order. */
export function lemmaTitles(roots: RootLemmas[]): string[] {
  return [...new Set(roots.flatMap((r) => r.lemmas.flatMap((l) => titleGuesses(l.ar))))];
}
