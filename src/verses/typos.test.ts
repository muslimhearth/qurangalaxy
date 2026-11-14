import { describe, expect, it } from 'vitest';
import {
  editDistance,
  letterMask,
  maxEdits,
  missingLetters,
  substringDistance,
  substringDistanceTable,
  typoScore,
  TYPO_SCORE,
} from './typos';

describe('letterMask and missingLetters', () => {
  it('counts query letters that the word does not have at all', () => {
    expect(missingLetters('rahmah', letterMask('warahmatan'))).toBe(0);
    expect(missingLetters('patiance', letterMask('patient'))).toBe(1);
    expect(missingLetters('xyzq', letterMask('abc'))).toBe(4);
  });
});

describe('maxEdits', () => {
  it('allows no typo in 1–3 letters, 1 in 4–6 letters, 2 in 7 or more', () => {
    expect([1, 3, 4, 6, 7, 12].map(maxEdits)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe('editDistance', () => {
  it('counts changes, additions, drops and swaps of neighbours', () => {
    expect(editDistance('patience', 'patience', 2)).toBe(0);
    expect(editDistance('patiance', 'patience', 2)).toBe(1);
    expect(editDistance('patince', 'patience', 2)).toBe(1);
    expect(editDistance('pateince', 'patience', 2)).toBe(1);
    expect(editDistance('mohamad', 'muhammad', 2)).toBe(2);
  });

  it('stops at max + 1', () => {
    expect(editDistance('abcdef', 'uvwxyz', 1)).toBe(2);
    expect(editDistance('ab', 'abcdef', 2)).toBe(3);
  });
});

describe('substringDistance', () => {
  it('finds the word inside a longer word', () => {
    expect(substringDistance('rahma', 'warahmatan', 1)).toBe(0);
    expect(substringDistance('rahmah', 'rahmatan', 1)).toBe(1);
    expect(substringDistance('rahmha', 'rahmatan', 1)).toBe(1);
    expect(substringDistance('kitab', 'alkutubi', 1)).toBe(2);
  });

  it('the fast bit method gives the same distance as the table method', () => {
    // Small alphabet, so that random words share many letters.
    let seed = 7;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
    const word = (len: number) => Array.from({ length: len }, () => 'abcd'[rand(4)]).join('');
    for (let k = 0; k < 3000; k++) {
      const q = word(1 + rand(9));
      const t = word(rand(14));
      expect([q, t, substringDistance(q, t, 3)]).toEqual([q, t, substringDistanceTable(q, t, 3)]);
    }
    const long = 'abcdefghijklmnopqrstuvwxyzabcdef';
    expect(substringDistance(long, `xx${long}yy`, 2)).toBe(0);
    expect(substringDistance(long, `xx${long.slice(0, 31)}`, 2)).toBe(1);
    expect(substringDistance('kitab', 'كتاب kitab', 1)).toBe(0);
  });
});

describe('typoScore', () => {
  it('scores 1 edit above 2 edits, both below the weakest exact match (0.8)', () => {
    expect(TYPO_SCORE[1]).toBeLessThan(0.8);
    expect(TYPO_SCORE[2]).toBeLessThan(TYPO_SCORE[1]);
    expect(TYPO_SCORE[2]).toBeGreaterThan(0);
  });

  it('English: compares whole words and stems', () => {
    expect(typoScore('patiance', 'patiance', 'patience', 'patience', 'en')).toBe(TYPO_SCORE[1]);
    expect(typoScore('mohamad', 'mohamad', 'muhammad', 'muhammad', 'en')).toBe(TYPO_SCORE[2]);
    expect(typoScore('mercyful', 'mercyful', 'merciful', 'merciful', 'en')).toBe(TYPO_SCORE[1]);
    // A short stem allows fewer edits than the word: "pati" (from "patience") is far from "who".
    expect(typoScore('patience', 'pati', 'who', 'who', 'en')).toBe(0);
    // Typos inside a word do not count in English.
    expect(typoScore('mercx', 'mercx', 'unmerciful', 'unmerciful', 'en')).toBe(0);
  });

  it('transliteration: looks inside words', () => {
    expect(typoScore('rahmah', 'rahmah', 'warahmatan', 'warahmatan', 'tr')).toBe(TYPO_SCORE[1]);
    expect(typoScore('mohamad', 'mohamad', 'muhamadun', 'muhamadun', 'tr')).toBe(TYPO_SCORE[1]);
  });

  it('short words match exactly only', () => {
    expect(typoScore('gud', 'gud', 'god', 'god', 'en')).toBe(0);
    expect(typoScore('dai', 'dai', 'day', 'day', 'en')).toBe(0);
    expect(typoScore('rhm', 'rhm', 'rahm', 'rahm', 'tr')).toBe(0);
  });
});
