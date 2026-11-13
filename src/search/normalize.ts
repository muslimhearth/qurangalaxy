// Harakat, small Quranic marks, superscript alef and tatweel: none change which root a word is.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
// All alef and hamza forms map to bare alef, so "اله", "أله" and "ءله" match the same root.
const HAMZA_ALEF = /[أإآٱٲٳءؤئ]/g;
/** True when the text contains an Arabic letter. */
export const ARABIC_LETTER = /[؀-ۿ]/;

/** Normalizes Arabic for search: no diacritics or tatweel, one alef/hamza form, ى→ي. */
export function normalizeArabic(text: string): string {
  return text.replace(ARABIC_MARKS, '').replace(HAMZA_ALEF, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, '');
}

/** Normalizes a transliteration for search: lowercase, no diacritics, hyphens, ʾ/ʿ marks or spaces. */
export function normalizeLatin(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-\sʾʿʼʻ'`’‘]/g, '');
}
