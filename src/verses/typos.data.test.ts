// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Verses } from '../data/types';
import { buildVerseIndex, exactVerseMatches } from './exact';
import type { Translit } from './translit';

// Typo search on the real verse data (Saheeh International and Tanzil transliteration).
const verses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
const translit = JSON.parse(readFileSync('public/data/translit.json', 'utf8')) as Translit;
const index = buildVerseIndex(verses, translit);
const ALL = 10_000;
const search = (q: string, typos: boolean) => exactVerseMatches(index, q, ALL, typos);
const keys = (q: string, typos: boolean, limit = 30) =>
  search(q, typos)
    .slice(0, limit)
    .map((m) => m.key);

describe('typo tolerance on the real data', () => {
  it('"rahmah" finds 3:8 ("rahmatan") through the transliteration; without typos it finds nothing', () => {
    expect(keys('rahmah', true)).toContain('3:8');
    expect(search('rahmah', true).find((m) => m.key === '3:8')?.source).toBe('tr');
    expect(search('rahmah', false)).toEqual([]);
  });

  it('"patiance" finds the patience verses', () => {
    const top = keys('patiance', true, 10);
    expect(top).toHaveLength(10);
    for (const key of top) expect(verses[key]!.en).toMatch(/patien/i);
  });

  it('"mohamad" finds 47:2 and 48:29', () => {
    expect(keys('mohamad', true)).toEqual(expect.arrayContaining(['47:2', '48:29']));
  });

  it('a one-word query keeps its exact matches first, in the same order and with the same scores', () => {
    for (const q of ['rahma', 'patience', 'mercy']) {
      const off = search(q, false);
      expect(search(q, true).slice(0, off.length)).toEqual(off);
    }
  });

  it('a phrase keeps its best exact matches on top', () => {
    for (const q of ['patience and prayer', 'gardens beneath which rivers flow']) {
      expect(keys(q, true, 20)).toEqual(keys(q, false, 20));
    }
  });

  it('short words ("god", "day") match exactly only', () => {
    expect(search('god', true)).toEqual(search('god', false));
    expect(search('day', true)).toEqual(search('day', false));
  });
});
