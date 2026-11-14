/**
 * Word morphology data (G26 word card), built by `pnpm data` (scripts/build-morph.ts) from the
 * Quranic Arabic Corpus. Kept outside `src/data/types.ts`: an app-side extra, loaded lazily.
 */

/**
 * One word in a surah file: `[root, lemma, text1, tag1, text2, tag2, ...]`.
 * - `root`: root id (index in `Galaxy.roots`), or -1 for a word without a root.
 * - `lemma`: index in that root's `Root.lemmas`; for a word without a root, index in
 *   `Particles.lemmas`; -1 when the word has no lemma (e.g. Quranic initials).
 * - Then each segment (prefixes, stem, suffixes, in reading order): its Corpus text and an index
 *   into `MorphTags`.
 */
export type MorphRow = (string | number)[];

/**
 * One Tanzil word. A number marks the second Tanzil word of a pair the Corpus joins into one
 * word (e.g. بَعْدَ مَا): it is the 1-based position of the first word, which holds the row.
 */
export type MorphEntry = MorphRow | number;

/** Contents of public/data/morph/{surah}.json: index ayah-1, then Tanzil word position-1. */
export type SurahMorph = MorphEntry[][];

/**
 * Contents of public/data/morph/tags.json: the distinct segment tags, e.g. "V|PERF|VF:1|3MP"
 * (Corpus tag, then its features without lemma and root).
 */
export type MorphTags = string[];

/**
 * Contents of public/data/particles.json: the words without a root, grouped by lemma.
 * `words[i]` lists the words of `lemmas[i]` as global Tanzil word indices (0-based, counted over
 * all verses in Quran order), delta-coded: each number is the gap from the previous one.
 */
export interface Particles {
  lemmas: string[];
  words: number[][];
}
