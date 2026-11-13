import { describe, expect, it } from 'vitest';
import { parseMorphology } from './morphology';

const SAMPLE = [
  '1:1:1:1\tبِ\tP\tP|PREF|LEM:ب',
  '1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN',
  '1:1:2:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN',
  '1:2:1:1\tمَا\tP\tNEG|LEM:مَا',
  // One word with two roots (يَبْنَؤُمَّ).
  '20:94:2:1\tيَ\tP\tVOC|PREF|LEM:ي',
  '20:94:2:2\tبْنَ\tN\tROOT:بني|LEM:ابْن|M|ACC',
  '20:94:2:3\tؤُمَّ\tN\tROOT:أمم|LEM:أُمّ|FS|GEN',
  '',
].join('\n');

describe('parseMorphology', () => {
  it('returns one entry per root segment with its lemma', () => {
    const { rootWords } = parseMorphology(SAMPLE);
    expect(rootWords).toEqual([
      { verse: '1:1', word: 1, root: 'سمو', lemma: 'اسْم' },
      { verse: '1:1', word: 2, root: 'أله', lemma: 'اللَّه' },
      { verse: '20:94', word: 2, root: 'بني', lemma: 'ابْن' },
      { verse: '20:94', word: 2, root: 'أمم', lemma: 'أُمّ' },
    ]);
  });

  it('counts all words per verse, with or without a root', () => {
    const { verseWordCounts } = parseMorphology(SAMPLE);
    expect(verseWordCounts.get('1:1')).toBe(2);
    expect(verseWordCounts.get('1:2')).toBe(1);
    expect(verseWordCounts.get('20:94')).toBe(2);
  });

  it('throws on a malformed line', () => {
    expect(() => parseMorphology('1:1\tx\tN\tM')).toThrow(/line 1/);
  });
});
