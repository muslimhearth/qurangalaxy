import { describe, expect, it } from 'vitest';
import { normalizeArabic, normalizeLatin, searchRoots } from './search';
import { fixtureGalaxy } from '../data/fixture';
import type { Root } from '../data/types';

const ids = (q: string, limit?: number) => searchRoots(fixtureGalaxy.roots, q, limit).map((r) => r.id);

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

describe('searchRoots', () => {
  it('returns nothing for an empty query', () => {
    expect(ids('  ')).toEqual([]);
  });

  it('finds a root by transliteration without diacritics', () => {
    expect(ids('rhm')).toEqual([2]);
  });

  it('finds a root by Arabic letters, ignoring hamza form', () => {
    expect(ids('اله')[0]).toBe(1);
    expect(ids('رحم')[0]).toBe(2);
  });

  it('finds a root by one of its lemmas', () => {
    expect(ids('رحمن')).toContain(2);
    expect(ids('سماء')).toContain(0);
  });

  it('ranks exact matches first, then by count', () => {
    // "r" prefixes both r-ḥ-m (339) and r-b-b (980): higher count first.
    expect(ids('r')).toEqual([4, 2]);
    const roots: Root[] = [
      { ...fixtureGalaxy.roots[0]!, id: 0, tr: 'k-t-b-x', count: 900 },
      { ...fixtureGalaxy.roots[1]!, id: 1, tr: 'k-t-b', count: 10 },
    ];
    expect(searchRoots(roots, 'ktb').map((r) => r.id)).toEqual([1, 0]);
  });

  it('limits the number of results', () => {
    expect(ids('ا', 2)).toHaveLength(2);
  });
});
