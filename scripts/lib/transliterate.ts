/** Latin form of each Arabic letter that occurs in corpus roots (ALA-LC style). */
const LETTERS: Record<string, string> = {
  // All hamza carriers are the same root consonant.
  ء: 'ʾ', أ: 'ʾ', إ: 'ʾ', ؤ: 'ʾ', ئ: 'ʾ', آ: 'ʾ',
  // Bare alif appears in a few particle-like roots (e.g. هات).
  ا: 'ā',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'ḥ', خ: 'kh', د: 'd', ذ: 'dh',
  ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 'ṣ', ض: 'ḍ', ط: 'ṭ', ظ: 'ẓ',
  ع: 'ʿ', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', و: 'w', ي: 'y', ى: 'y',
};

/** Transliterates root letters to Latin joined by hyphens, e.g. "رحم" → "r-ḥ-m". */
export function transliterateRoot(root: string): string {
  return [...root]
    .map((letter) => {
      const latin = LETTERS[letter];
      if (latin === undefined) throw new Error(`No transliteration for letter "${letter}" in root "${root}"`);
      return latin;
    })
    .join('-');
}
