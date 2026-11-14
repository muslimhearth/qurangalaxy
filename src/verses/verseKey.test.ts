import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AYAH_COUNTS, parseVerseQuery } from './verseKey';

describe('parseVerseQuery', () => {
  it('reads "s:v" with or without spaces', () => {
    expect(parseVerseQuery('3:109')).toEqual({ kind: 'verse', key: '3:109' });
    expect(parseVerseQuery(' 3 : 109 ')).toEqual({ kind: 'verse', key: '3:109' });
    expect(parseVerseQuery('3 109')).toEqual({ kind: 'verse', key: '3:109' });
    expect(parseVerseQuery('2.255')).toEqual({ kind: 'verse', key: '2:255' });
    expect(parseVerseQuery('003:009')).toEqual({ kind: 'verse', key: '3:9' });
  });

  it('reports keys that name no verse', () => {
    expect(parseVerseQuery('1:8')).toEqual({ kind: 'invalid', message: 'No verse 1:8. Surah 1 has 7 verses.' });
    expect(parseVerseQuery('115:1')).toEqual({ kind: 'invalid', message: 'No surah 115. There are 114 surahs.' });
    expect(parseVerseQuery('0:1')).toEqual({ kind: 'invalid', message: 'No surah 0. There are 114 surahs.' });
    expect(parseVerseQuery('2:0')).toEqual({ kind: 'invalid', message: 'No verse 2:0. Surah 2 has 286 verses.' });
  });

  it('ignores anything else', () => {
    for (const q of ['', 'light', '3', '3:', 'rhm 3', '3:109:2', '3:10x']) expect(parseVerseQuery(q)).toEqual({ kind: 'none' });
  });
});

describe('AYAH_COUNTS', () => {
  it('matches verses.json', () => {
    const verses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Record<string, unknown>;
    const counts: number[] = [];
    for (const key of Object.keys(verses)) {
      const [s, a] = key.split(':').map(Number) as [number, number];
      counts[s - 1] = Math.max(counts[s - 1] ?? 0, a);
    }
    expect(AYAH_COUNTS).toEqual(counts);
    expect(AYAH_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
  });
});
