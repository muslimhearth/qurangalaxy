import { describe, expect, it } from 'vitest';
import { SURAHS, placeOf, readerLabel, surahVerseKeys } from './surahs';
import { AYAH_COUNTS } from '../verses/verseKey';

describe('surahs', () => {
  it('has 114 surahs whose verse counts match the Tanzil text', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.map((s) => s.verses)).toEqual(AYAH_COUNTS);
    expect(SURAHS[1]).toEqual({ ar: 'البقرة', tr: 'Al-Baqara', en: 'The Cow', verses: 286 });
  });

  it('lists the verse keys of a surah in order', () => {
    expect(surahVerseKeys(1)).toEqual(['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7']);
    expect(surahVerseKeys(0)).toEqual([]);
  });

  it('turns a verse key into a reader place', () => {
    expect(placeOf('2:17')).toEqual({ surah: 2, verse: 17 });
  });

  it('labels a reader place with the surah name and the verse key', () => {
    expect(readerLabel({ surah: 2, verse: 17 })).toBe('Al-Baqara 2:17');
  });
});
