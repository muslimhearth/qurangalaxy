import { describe, expect, it } from 'vitest';
import { SURAHS, TOTAL_VERSES, surahStarts, verseIndex, verseAt } from './surahs';

describe('surahs', () => {
  it('lists 114 surahs with 6,236 verses in all', () => {
    expect(SURAHS).toHaveLength(114);
    expect(TOTAL_VERSES).toBe(6236);
    expect(SURAHS.reduce((s, x) => s + x.verses, 0)).toBe(6236);
  });

  it('has the known names and verse counts', () => {
    expect(SURAHS[0]).toEqual({ name: 'Al-Fatihah', verses: 7 });
    expect(SURAHS[1]).toEqual({ name: 'Al-Baqarah', verses: 286 });
    expect(SURAHS[17]!.name).toBe('Al-Kahf');
    expect(SURAHS[35]!.name).toBe('Ya-Sin');
    expect(SURAHS[54]!.name).toBe('Ar-Rahman');
    expect(SURAHS[111]!.name).toBe('Al-Ikhlas');
    expect(SURAHS[113]).toEqual({ name: 'An-Nas', verses: 6 });
  });

  it('maps verse keys to Mushaf indexes and back', () => {
    expect(surahStarts[0]).toBe(0);
    expect(surahStarts[1]).toBe(7);
    expect(verseIndex('1:1')).toBe(0);
    expect(verseIndex('2:1')).toBe(7);
    expect(verseIndex('114:6')).toBe(6235);
    expect(verseIndex('2:999')).toBe(-1);
    expect(verseIndex('115:1')).toBe(-1);
    expect(verseAt(7)).toEqual({ surah: 2, ayah: 1 });
    expect(verseAt(7 + 254)).toEqual({ surah: 2, ayah: 255 });
    expect(verseAt(6235)).toEqual({ surah: 114, ayah: 6 });
  });
});
