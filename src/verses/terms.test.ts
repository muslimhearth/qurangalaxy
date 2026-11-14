import { describe, expect, it } from 'vitest';
import { normalizeWord, queryTerms, stem, termScore, wordSpans } from './terms';

describe('normalizeWord', () => {
  it('lowercases English and drops accents and apostrophes', () => {
    expect(normalizeWord("Allah's", 'en')).toBe('allahs');
    expect(normalizeWord('Ṣalāh', 'en')).toBe('salah');
  });

  it('folds transliteration spellings: apostrophes and doubled letters', () => {
    expect(normalizeWord('alrraheemi', 'tr')).toBe('alrahemi');
    expect(normalizeWord('turjaAAu', 'tr')).toBe('turjau');
    expect(normalizeWord("turja'u", 'tr')).toBe('turjau');
  });
});

describe('wordSpans', () => {
  it('finds words with their positions', () => {
    expect(wordSpans('Say, "He is Allah."')).toEqual([
      { start: 0, end: 3 },
      { start: 6, end: 8 },
      { start: 9, end: 11 },
      { start: 12, end: 17 },
    ]);
  });
});

describe('queryTerms', () => {
  it('weighs English stop words 0 unless the query has nothing else', () => {
    expect(queryTerms('the patient ones', 'en')).toEqual([
      { word: 'the', weight: 0 },
      { word: 'patient', weight: 1 },
      { word: 'ones', weight: 1 },
    ]);
    expect(queryTerms('to whom', 'en')).toEqual([
      { word: 'to', weight: 1 },
      { word: 'whom', weight: 1 },
    ]);
  });

  it('weighs very short transliteration words less', () => {
    expect(queryTerms('ma alardi', 'tr')).toEqual([
      { word: 'ma', weight: 0.5 },
      { word: 'alardi', weight: 1 },
    ]);
  });
});

describe('stem', () => {
  it('drops one common ending', () => {
    expect(stem('patience')).toBe('pati');
    expect(stem('patient')).toBe('pati');
    expect(stem('believers')).toBe('believ');
    expect(stem('light')).toBe('light');
    expect(stem('sees')).toBe('sees');
  });
});

describe('termScore', () => {
  it('matches English whole words, plurals and word starts', () => {
    expect(termScore('light', 'light', 'en')).toBe(1);
    expect(termScore('believer', 'believers', 'en')).toBe(1);
    expect(termScore('patien', 'patience', 'en')).toBe(0.8);
    expect(termScore('patience', 'patient', 'en')).toBe(0.9);
    expect(termScore('believed', 'believe', 'en')).toBe(0.9);
    expect(termScore('pat', 'patience', 'en')).toBe(0);
    expect(termScore('light', 'lightning', 'en')).toBe(0.8);
    expect(termScore('sky', 'sea', 'en')).toBe(0);
  });

  it('matches transliteration inside words (prefixes like al-, endings)', () => {
    expect(termScore('rahman', 'alrahmani', 'tr')).toBe(0.8);
    expect(termScore('ma', 'ma', 'tr')).toBe(1);
    expect(termScore('ma', 'alsamawati', 'tr')).toBe(0);
  });
});
