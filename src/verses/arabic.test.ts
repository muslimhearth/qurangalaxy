import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Occurrences, VerseKey, Verses } from '../data/types';
import { buildWordForms, indexWordForms } from '../search/wordForms';
import { arabicIndexFor, arabicVerseMatches, buildArabicIndex, markedArabic, ROOT_FORM } from './arabic';

// Real Tanzil Uthmani verses and corpus word positions (public/data), cut to a few verses.
const allVerses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
const allOccurrences = JSON.parse(readFileSync('public/data/occurrences.json', 'utf8')) as Occurrences;
const KEYS: VerseKey[] = ['1:1', '1:3', '2:157', '2:189', '2:215', '2:217', '7:63', '17:24'];
const verses: Verses = Object.fromEntries(KEYS.map((k) => [k, allVerses[k]!]));
const occurrences: Occurrences = allOccurrences.map((list) => list.filter((o) => KEYS.includes(o.v)));
const forms = indexWordForms(buildWordForms(verses, occurrences));
const index = buildArabicIndex(verses);
const search = (q: string) => arabicVerseMatches(index, q, forms, 30);

describe('arabicVerseMatches', () => {
  it('finds a typed word in the Uthmani text, whatever the hamza spelling', () => {
    for (const q of ['يسألونك', 'يسالونك']) {
      const keys = search(q).map((m) => m.key);
      expect(keys.slice(0, 3).sort()).toEqual(['2:189', '2:215', '2:217']);
    }
    expect(search('يسألونك')[0]).toMatchObject({ score: 1, source: 'ar' });
  });

  it('ranks whole words first, then other forms of the root', () => {
    const results = search('الرحمة');
    // 17:24 has ٱلرَّحْمَةِ; 2:157 (وَرَحْمَةٌ), 1:1 (ٱلرَّحْمَٰنِ) and 7:63 (تُرْحَمُونَ) share the root.
    expect(results[0]).toMatchObject({ key: '17:24', score: 1 });
    const rest = results.slice(1);
    expect(rest.map((m) => m.key).sort()).toEqual(['1:1', '1:3', '2:157', '7:63']);
    for (const m of rest) expect(m.score).toBeCloseTo(ROOT_FORM);
  });

  it('gives a phrase in order more than the same words apart', () => {
    const results = search('الرحمن الرحيم');
    expect(results[0]!.score).toBeGreaterThan(0.99);
    expect(results.map((m) => m.key).slice(0, 2).sort()).toEqual(['1:1', '1:3']);
  });

  it('finds words by their start while typing', () => {
    expect(search('يسـ').length).toBe(0); // one key letter after folding: too short
    expect(search('يسأل').map((m) => m.key)).toContain('2:189');
  });

  it('returns nothing for Latin text', () => {
    expect(search('mercy')).toEqual([]);
  });
});

describe('arabicIndexFor', () => {
  it('builds the index once per verses object', () => {
    expect(arabicIndexFor(verses)).toBe(arabicIndexFor(verses));
    expect(arabicIndexFor(verses).keys).toEqual(index.keys);
  });
});

describe('markedArabic', () => {
  it('marks the matched words and starts a long verse near the first hit', () => {
    const parts = markedArabic(verses['2:189']!.ar, 'ظهورها', forms, 8);
    const marked = parts.filter((p) => p.hit).map((p) => p.text);
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.every((t) => t.includes('ظُهُورِهَا'))).toBe(true);
    expect(parts[0]!.text.startsWith('… ')).toBe(true);
  });

  it('shows the whole text unmarked for a Latin query', () => {
    expect(markedArabic(verses['1:1']!.ar, 'mercy', forms, 8)).toEqual([{ text: verses['1:1']!.ar, hit: false }]);
  });
});
