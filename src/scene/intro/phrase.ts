/** «القرآن الكريم» in Uthmani spelling (alef wasla, hamza on the line), as Amiri Quran draws it. */
export const PHRASE_WORDS = ['ٱلْقُرْءَانُ', 'ٱلْكَرِيمُ'] as const;

/** The font the words are drawn in (self-hosted through Fontsource). */
export const PHRASE_FONT = 'Amiri Quran';

/**
 * Text lines for a view of this aspect ratio: one line on wide screens,
 * the two words stacked on tall (phone) screens so they stay large.
 */
export function phraseLines(aspect: number): string[] {
  return aspect < 0.9 ? [...PHRASE_WORDS] : [PHRASE_WORDS.join(' ')];
}
