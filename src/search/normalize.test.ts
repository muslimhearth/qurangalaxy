import { describe, expect, it } from 'vitest';
import { normalizeArabic, normalizeLatin } from './normalize';

describe('normalizeArabic', () => {
  it('strips diacritics and tatweel', () => {
    expect(normalizeArabic('رَحْمٰن')).toBe('رحمن');
    expect(normalizeArabic('رحـــم')).toBe('رحم');
  });

  it('unifies hamza forms and alef variants', () => {
    expect(normalizeArabic('أله')).toBe(normalizeArabic('اله'));
    expect(normalizeArabic('ٱللَّه')).toBe('الله');
    expect(normalizeArabic('إله')).toBe(normalizeArabic('آله'));
    expect(normalizeArabic('سئل')).toBe(normalizeArabic('سأل'));
    expect(normalizeArabic('هدى')).toBe(normalizeArabic('هدي'));
  });
});

describe('normalizeLatin', () => {
  it('drops diacritics, hyphens, ayn/hamza marks and case', () => {
    expect(normalizeLatin('r-ḥ-m')).toBe('rhm');
    expect(normalizeLatin('ʿ-l-m')).toBe('lm');
    expect(normalizeLatin('ʾ-L-h')).toBe('lh');
  });
});
