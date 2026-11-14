/** One surah's names and size, from Tanzil's quran-data.js. */
export interface SurahMeta {
  /** Arabic name, e.g. "البقرة". */
  ar: string;
  /** Transliterated name, e.g. "Al-Baqara". */
  tr: string;
  /** English name, e.g. "The Cow". */
  en: string;
  /** Number of verses. */
  verses: number;
}

// One surah row: [start, ayas, order, rukus, 'name', "tname", 'ename', 'type'].
// Names are quoted with ' or "; a transliterated name can hold an apostrophe ("Al-A'raaf").
const ROW = /^\s*\[\d+,\s*(\d+),\s*\d+,\s*\d+,\s*(['"])(.*?)\2,\s*(['"])(.*?)\4,\s*(['"])(.*?)\6,/;

/**
 * Reads the surah table of Tanzil's quran-data.js (Quran Metadata 1.0, CC BY 3.0).
 * Throws unless exactly `expected` surahs are found.
 */
export function parseSurahs(js: string, expected = 114): SurahMeta[] {
  const start = js.indexOf('QuranData.Sura = [');
  if (start < 0) throw new Error('No QuranData.Sura table');
  const end = js.indexOf('];', start);
  const surahs: SurahMeta[] = [];
  for (const line of js.slice(start, end).split('\n')) {
    const m = ROW.exec(line);
    if (m) surahs.push({ ar: m[3]!, tr: m[5]!, en: m[7]!, verses: Number(m[1]) });
  }
  if (surahs.length !== expected) throw new Error(`Found ${surahs.length} surahs, expected ${expected}`);
  return surahs;
}
