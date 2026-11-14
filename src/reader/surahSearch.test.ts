import { describe, expect, it } from 'vitest';
import { latinKey, searchSurahs } from './surahSearch';

/** Surah numbers found for a query. */
const nums = (q: string) => searchSurahs(q).map((m) => m.surah);

describe('latinKey', () => {
  it('drops case, hyphens, apostrophes and doubled letters', () => {
    expect(latinKey("Al-A'raaf")).toBe('alaraf');
    expect(latinKey('Yaseen')).toBe('yasin');
    expect(latinKey('ya sin')).toBe('yasin');
    expect(latinKey('baqarah')).toBe('baqara');
  });
});

describe('searchSurahs', () => {
  it('finds transliterated names, with or without the article and spelling variants', () => {
    for (const q of ['baqara', 'Baqarah', 'al baqarah', 'Al-Baqara', 'albaqara', 'baq']) expect(nums(q)[0], q).toBe(2);
    expect(nums('yasin')[0]).toBe(36);
    expect(nums('ya sin')[0]).toBe(36);
    expect(nums('rahman')[0]).toBe(55);
    expect(nums('imran')[0]).toBe(3);
    expect(nums('noor')[0]).toBe(24);
  });

  it('finds English meanings', () => {
    expect(nums('the cow')).toEqual([2]);
    expect(nums('cow')).toEqual([2]);
    expect(nums('bee')).toEqual([16]);
    expect(nums('journey')).toEqual([17]);
  });

  it('finds Arabic names with or without ال, in plain or marked spelling', () => {
    expect(nums('البقرة')[0]).toBe(2);
    expect(nums('بقرة')[0]).toBe(2);
    expect(nums('ٱلْبَقَرَة')[0]).toBe(2);
    expect(nums('يس')[0]).toBe(36);
  });

  it('takes "surah 2" and "sura 16"', () => {
    expect(nums('surah 2')).toEqual([2]);
    expect(nums('sura 16')).toEqual([16]);
    expect(nums('Surat al-Kahf')).toEqual([18]);
    expect(nums('surah 115')).toEqual([]);
  });

  it('puts an exact name first, keeps at most 3, and needs 3 letters to match a name start', () => {
    expect(nums('the dawn')).toEqual([89, 113]);
    expect(nums('man')[0]).toBe(76);
    expect(nums('al')).toEqual([]);
    expect(nums('the')).toEqual([]);
    expect(nums('ma')).toEqual([]);
    expect(nums('the').length).toBeLessThanOrEqual(3);
    expect(nums('al-m').length).toBe(0);
  });

  it('ignores verse keys, numbers and empty text', () => {
    expect(nums('2:255')).toEqual([]);
    expect(nums('16')).toEqual([]);
    expect(nums('  ')).toEqual([]);
  });
});
