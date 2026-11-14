import { describe, expect, it } from 'vitest';
import type { Verses, VerseKey } from '../../src/data/types';
import { windowTexts } from './embed-verses';

describe('windowTexts', () => {
  it('puts the previous and next verse of the same surah around each verse', () => {
    const verses = { '1:1': { ar: '', en: 'A.' }, '1:2': { ar: '', en: 'B.' }, '2:1': { ar: '', en: 'C.' } } as Verses;
    const keys = Object.keys(verses) as VerseKey[];
    expect(windowTexts(keys, verses)).toEqual(['A. B.', 'A. B.', 'C.']);
  });
});
