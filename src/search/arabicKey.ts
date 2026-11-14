/**
 * Search key of an Arabic word: one form for the Tanzil Uthmani spelling and for plain
 * keyboard text, so "يسالونك" finds يَسْـَٔلُونَكَ and "الصلاة" finds ٱلصَّلَوٰةَ.
 */
import { ARABIC_LETTER } from './normalize';

// Harakat, Quranic signs, dagger alef and tatweel (U+0640).
const MARKS = '\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640';
const ALL_MARKS = new RegExp(`[${MARKS}]`, 'g');
// A small waw or yaa after a final haa lengthens the pronoun (بِهِۦ); plain text does not write it.
const PRONOUN_LENGTH = /ه([ً-ْ]*)[ۥۦ][ؐ-ًؚ-ٟۖ-ۭ]*$/;
// Alef maqsura with dagger alef inside a word (أَدْرَىٰكَ) is written as alef in plain text (أدراك).
const INNER_ALEF_MAQSURA = /ىٰ(?=[ؐ-ًؚ-ٟۖ-ۭ]*[ء-ي])/g;
// Every alef and hamza form. They are dropped: Uthmani and plain text place them differently.
const ALEF_HAMZA = /[اأإآٱٲٳءؤئ]/g;
const ARABIC_WORD = /[ء-يؐ-ًؚ-ٰٟٱ-ۓە-ۭ]+/g;

/**
 * Search key of one Arabic word. Rules, in order:
 * 1. Small waw/yaa after a final haa: dropped. Other small yaa (إِبْرَٰهِـۧمُ): ي. Small waw: و.
 * 2. Waw with dagger alef (صلوٰة) and alef maqsura with dagger alef inside a word: alef.
 * 3. Yaa with the "silent" sign (U+06DF): dropped.
 * 4. All marks and tatweel: dropped. ى → ي, ة → ه.
 * 5. All alef and hamza forms: dropped (يسألونك, يسـٔلونك and يسالونك agree).
 */
export function arabicKey(word: string): string {
  return word
    .replace(PRONOUN_LENGTH, 'ه$1')
    .replace(/[ۦۧ]/g, 'ي')
    .replace(/ۥ/g, 'و')
    .replace(/وٰ/g, 'ا')
    .replace(INNER_ALEF_MAQSURA, 'ا')
    .replace(/ي۟/g, '')
    .replace(ALL_MARKS, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(ALEF_HAMZA, '');
}

/** The Arabic words of a text (letters with their marks); other characters split words. */
export function arabicWords(text: string): string[] {
  return text.match(ARABIC_WORD) ?? [];
}

/** True when the query contains an Arabic letter: it is searched as Arabic, not by meaning. */
export function isArabicQuery(query: string): boolean {
  return ARABIC_LETTER.test(query);
}
