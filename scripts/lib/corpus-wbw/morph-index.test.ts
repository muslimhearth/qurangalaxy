import { describe, expect, it } from 'vitest';
import { indexMorphology } from './morph-index';

const MORPH = [
  '1:1:1:1\tبِ\tP\tP|PREF|LEM:ب',
  '1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN',
  '1:1:2:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN',
  '1:2:1:1\tٱلْ\tP\tDET|PREF|LEM:ال',
  '1:2:1:2\tحَمْدُ\tN\tROOT:حمد|LEM:حَمْد|M|NOM',
  '2:255:9:1\tتَأْخُذُ\tV\tIMPF|VF:1|ROOT:أخذ|LEM:أَخَذَ|3FS|MOOD:IND',
  '2:255:9:2\tهُۥ\tN\tPRON|SUFF|3MS',
  '2:255:5:1\tهُوَ\tN\tPRON|3MS',
  '2:255:11:1\tوَ\tP\tCONJ|PREF|LEM:و',
  '2:255:11:2\tلَا\tP\tNEG|LEM:لا',
  '',
].join('\n');

describe('indexMorphology', () => {
  const index = indexMorphology(MORPH);

  it('lists verses in Quran order with their word counts', () => {
    expect(index.verses).toEqual(['1:1', '1:2', '2:255']);
    expect(index.verseWordCounts.get('1:1')).toBe(2);
    expect(index.verseWordCounts.get('2:255')).toBe(11);
  });

  it('takes the root segment as the main lemma of a word', () => {
    expect(index.words.get('1:1:1')).toEqual({
      lemma: 'اسْم',
      root: 'سمو',
      properNoun: false,
      prepPrefix: true,
      pronSuffix: false,
    });
    expect(index.words.get('1:1:2')).toMatchObject({ lemma: 'اللَّه', root: 'أله', properNoun: true });
  });

  it('marks pronoun suffixes', () => {
    expect(index.words.get('2:255:9')).toMatchObject({ lemma: 'أَخَذَ', pronSuffix: true, prepPrefix: false });
  });

  it('uses the first non-prefix lemma for a word without a root', () => {
    expect(index.words.get('2:255:11')).toMatchObject({ lemma: 'لا', root: undefined });
  });

  it('keeps words without any lemma, with no lemma', () => {
    expect(index.words.get('2:255:5')).toMatchObject({ lemma: undefined, root: undefined });
  });

  it('rejects malformed lines', () => {
    expect(() => indexMorphology('nonsense')).toThrow(/line 1/);
  });
});
