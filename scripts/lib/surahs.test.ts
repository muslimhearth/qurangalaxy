import { describe, expect, it } from 'vitest';
import { parseSurahs } from './surahs';

const JS = `
// Quran Metadata (ver 1.0)
var QuranData = {};
QuranData.Sura = [
	// [start, ayas, order, rukus, name, tname, ename, type]
	[],
	[0, 7, 5, 1, 'الفاتحة', "Al-Faatiha", 'The Opening', 'Meccan'],
	[7, 286, 87, 40, 'البقرة', "Al-Baqara", 'The Cow', 'Medinan'],
	[954, 206, 39, 24, 'الأعراف', "Al-A'raaf", 'The Heights', 'Meccan'],
	[6236, 1]
];
QuranData.Juz = [
	[],
	[1, 1],
];
`;

describe('parseSurahs', () => {
  it('reads name, transliterated name, English name and verse count per surah, in order', () => {
    expect(parseSurahs(JS, 3)).toEqual([
      { ar: 'الفاتحة', tr: 'Al-Faatiha', en: 'The Opening', verses: 7 },
      { ar: 'البقرة', tr: 'Al-Baqara', en: 'The Cow', verses: 286 },
      { ar: 'الأعراف', tr: "Al-A'raaf", en: 'The Heights', verses: 206 },
    ]);
  });

  it('fails when the surah count is wrong', () => {
    expect(() => parseSurahs(JS, 114)).toThrow(/3 surahs/);
  });
});
