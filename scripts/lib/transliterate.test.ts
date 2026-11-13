import { describe, expect, it } from 'vitest';
import { transliterateRoot } from './transliterate';

describe('transliterateRoot', () => {
  it('maps letters and joins them with hyphens', () => {
    expect(transliterateRoot('رحم')).toBe('r-ḥ-m');
    expect(transliterateRoot('علم')).toBe('ʿ-l-m');
    expect(transliterateRoot('كتب')).toBe('k-t-b');
  });

  it('maps every hamza form to ʾ', () => {
    expect(transliterateRoot('أله')).toBe('ʾ-l-h');
    for (const h of ['ء', 'أ', 'إ', 'ؤ', 'ئ', 'آ']) {
      expect(transliterateRoot(h)).toBe('ʾ');
    }
  });

  it('uses digraphs for letters without a single Latin form', () => {
    expect(transliterateRoot('ثخذشغ')).toBe('th-kh-dh-sh-gh');
    expect(transliterateRoot('صضطظ')).toBe('ṣ-ḍ-ṭ-ẓ');
  });

  it('covers alif and the glides', () => {
    expect(transliterateRoot('هات')).toBe('h-ā-t');
    expect(transliterateRoot('وقي')).toBe('w-q-y');
  });

  it('throws on a letter it does not know', () => {
    expect(() => transliterateRoot('xyz')).toThrow(/x/);
  });
});
