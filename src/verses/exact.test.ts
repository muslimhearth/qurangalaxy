import { describe, expect, it } from 'vitest';
import type { Verses } from '../data/types';
import { buildVerseIndex, exactVerseMatches } from './exact';

const verses = {
  '1:1': { ar: 'a', en: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
  '2:153': { ar: 'b', en: 'O you who have believed, seek help through patience and prayer.' },
  '2:155': { ar: 'c', en: 'And give good tidings to the patient.' },
  '24:35': { ar: 'd', en: 'Allah is the Light of the heavens and the earth.' },
  '3:109': { ar: 'e', en: 'To Allah belongs whatever is in the heavens and whatever is on the earth.' },
} as Verses;
const translit = {
  '1:1': 'Bismi All<u>a</U>hi a<b>l</B>rra<u>h</U>m<u>a</U>ni a<b>l</B>rra<u>h</U>eem<b>i</b>',
  '3:109': 'Walill<u>a</u>hi m<u>a</u> fee a<b>l</b>ssam<u>a</u>w<u>a</u>ti wam<u>a</u> fee alar<u>d</u>i',
};
const index = buildVerseIndex(verses, translit);
const keys = (q: string) => exactVerseMatches(index, q, 10).map((m) => m.key);

describe('exactVerseMatches', () => {
  it('finds English words, best coverage first', () => {
    expect(keys('patience')).toEqual(['2:153', '2:155']);
    expect(keys('heavens earth light')[0]).toBe('24:35');
  });

  it('ranks a whole phrase above the same words apart', () => {
    const idx = buildVerseIndex(
      { '1:1': { ar: '', en: 'the earth and the heavens' }, '1:2': { ar: '', en: 'the heavens and the earth' } } as Verses,
      {},
    );
    expect(exactVerseMatches(idx, 'heavens and the earth', 5).map((m) => m.key)).toEqual(['1:2', '1:1']);
  });

  it('ignores stop words for matching', () => {
    expect(keys('the')).toEqual(['1:1', '2:155', '24:35', '3:109']);
    expect(keys('the light')).toEqual(['24:35']);
  });

  it('finds transliteration and says so', () => {
    const [hit] = exactVerseMatches(index, 'arrahman', 5);
    expect(keys('alrrahmani')).toEqual(['1:1']);
    expect(keys('rahman')).toEqual(['1:1']);
    expect(keys('walillahi ma fee alssamawati')).toEqual(['3:109']);
    expect(hit).toBeUndefined(); // assimilated spelling "arrahman" is not in Tanzil's text
    expect(exactVerseMatches(index, 'samawati', 5)[0]).toMatchObject({ key: '3:109', source: 'tr' });
  });

  it('scores in 0..1 and returns nothing for an empty query', () => {
    expect(exactVerseMatches(index, '  ', 5)).toEqual([]);
    for (const m of exactVerseMatches(index, 'allah heavens', 5)) expect(m.score).toBeGreaterThan(0);
    expect(exactVerseMatches(index, 'heavens and the earth', 5)[0]!.score).toBeLessThanOrEqual(1);
  });

  it('stops at the limit', () => {
    expect(exactVerseMatches(index, 'allah', 2)).toHaveLength(2);
  });
});
