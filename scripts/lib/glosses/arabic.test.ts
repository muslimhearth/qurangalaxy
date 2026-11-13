import { describe, expect, it } from 'vitest';
import { lemmaKey, looseKey, pageTitle, rootKey, vowelScore, wiktionaryRoot } from './arabic';

describe('wiktionaryRoot', () => {
  it('separates letters with spaces and writes every hamza as ء', () => {
    expect(wiktionaryRoot('نور')).toBe('ن و ر');
    expect(wiktionaryRoot('أله')).toBe('ء ل ه');
    expect(wiktionaryRoot('لؤلؤ')).toBe('ل ء ل ء');
  });
});

describe('rootKey', () => {
  it('makes corpus and Wiktionary root spellings comparable', () => {
    expect(rootKey('ء ل ه')).toBe(rootKey('أله'));
    expect(rootKey('ع|ل|م')).toBe(rootKey('علم'));
  });
});

describe('pageTitle', () => {
  it('drops diacritics but keeps hamza forms, as Wiktionary titles do', () => {
    expect(pageTitle('رَحْمٰن')).toBe('رحمن');
    expect(pageTitle('إِلٰه')).toBe('إله');
    expect(pageTitle('ٱللَّه')).toBe('الله');
    expect(pageTitle('قالَ')).toBe('قال');
  });
});

describe('lemmaKey and looseKey', () => {
  it('treat the superscript alef as a long a', () => {
    expect(lemmaKey('رَحْمٰن')).toBe(lemmaKey('رَحْمَان'));
  });

  it('unify taa marbuta, hamza forms and alef maqsura', () => {
    expect(lemmaKey('مَكانَت')).toBe(lemmaKey('مَكَانَة'));
    expect(lemmaKey('هُدًى')).toBe(lemmaKey('هدي'));
  });

  it('loose key ignores every alef', () => {
    expect(looseKey('ٱللَّه')).toBe(looseKey('اللّٰه'));
    expect(looseKey('عَٰلَمِين')).toBe(looseKey('عالمين'));
  });
});

describe('vowelScore', () => {
  it('prefers the entry with the same vowels', () => {
    const lemma = 'عِلْم';
    expect(vowelScore(lemma, 'عِلْم')).toBeGreaterThan(vowelScore(lemma, 'عَلَم'));
    expect(vowelScore('عَلَّمَ', 'عَلَّمَ')).toBeGreaterThan(vowelScore('عَلَّمَ', 'عَلِمَ'));
  });

  it('ignores missing vowels and plain-alef spelling differences', () => {
    expect(vowelScore('قالَ', 'قَالَ')).toBeGreaterThan(0);
    expect(vowelScore('رَحْمٰن', 'رَحْمَان')).toBeGreaterThan(0);
  });
});
