import type { VerseKey } from '../data/types';

/** Number of verses in each surah (index 0 = surah 1), as in Tanzil's text. */
export const AYAH_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36,
  25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

/** What a search text says about verse keys: a real verse, a key that names none, or no key. */
export type VerseQuery = { kind: 'verse'; key: VerseKey } | { kind: 'invalid'; message: string } | { kind: 'none' };

// "3:109", "3 109", "3 : 109", "2.255".
const KEY = /^\s*(\d{1,3})\s*(?::|\.|\s)\s*(\d{1,3})\s*$/;

/** True when `key` names a verse of the Quran. */
export function isVerseKey(key: string): key is VerseKey {
  const m = /^(\d+):(\d+)$/.exec(key);
  if (!m) return false;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  return surah >= 1 && surah <= AYAH_COUNTS.length && ayah >= 1 && ayah <= AYAH_COUNTS[surah - 1]!;
}

/** Reads a verse key ("s:v", "s v") from search text and checks that the verse exists. */
export function parseVerseQuery(text: string): VerseQuery {
  const m = KEY.exec(text);
  if (!m) return { kind: 'none' };
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  if (surah < 1 || surah > AYAH_COUNTS.length) return { kind: 'invalid', message: `No surah ${surah}. There are ${AYAH_COUNTS.length} surahs.` };
  const key = `${surah}:${ayah}`;
  if (!isVerseKey(key)) return { kind: 'invalid', message: `No verse ${key}. Surah ${surah} has ${AYAH_COUNTS[surah - 1]} verses.` };
  return { kind: 'verse', key };
}
