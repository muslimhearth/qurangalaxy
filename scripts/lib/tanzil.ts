import type { VerseKey } from '../../src/data/types';

/**
 * Parses a Tanzil "txt-2" file (lines `surah|ayah|text`) into verse texts keyed by "s:a".
 * Skips blank lines and the `#` license block at the end.
 */
export function parseTanzil(text: string): Map<VerseKey, string> {
  const verses = new Map<VerseKey, string>();
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '' || line.startsWith('#')) return;
    const match = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
    if (!match) throw new Error(`Malformed Tanzil line ${i + 1}: ${line.slice(0, 60)}`);
    verses.set(`${Number(match[1])}:${Number(match[2])}`, match[3]!);
  });
  return verses;
}

// The basmala exactly as Tanzil encodes it, written as escapes because diacritic order
// matters (Tanzil puts shadda U+0651 before the vowel mark). Surahs 95 and 97 add a
// shadda on the first letter, so it is optional.
const BASMALA_PREFIX = new RegExp(
  '^بّ?ِسْمِ ' + // bismi
    'ٱللَّهِ ' + // allahi
    'ٱلرَّحْمَٰنِ ' + // al-rahmani
    'ٱلرَّحِيمِ ', // al-rahimi
);

/**
 * Removes the basmala that Tanzil puts before verse 1 of each surah (except 1 and 9),
 * so word positions match the corpus. Other verses come back unchanged.
 */
export function stripBasmala(key: VerseKey, text: string): string {
  const [surah, ayah] = key.split(':').map(Number);
  if (ayah !== 1 || surah === 1 || surah === 9) return text;
  if (!BASMALA_PREFIX.test(text)) throw new Error(`Verse ${key} does not start with the basmala`);
  return text.replace(BASMALA_PREFIX, '');
}
