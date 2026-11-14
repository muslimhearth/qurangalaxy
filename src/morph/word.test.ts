import { describe, expect, it } from 'vitest';
import type { SurahMorph } from './types';
import { wordAt } from './word';

const TAGS = ['V|PERF|VF:1|3MP', 'N|PRON|SUFF|3MP', 'P|P'];
// Verse 1: قَالُوٓا۟ فِى. Verse 2: a joined pair (word 2 points to word 1).
const SURAH: SurahMorph = [[[4, 1, 'قَالُ', 0, 'وٓا۟', 1], [-1, 3, 'فِى', 2]], [[7, 0, 'بَعْدَمَا', 2], 1]];

describe('wordAt', () => {
  it('decodes root, lemma and segments with their tags', () => {
    expect(wordAt(SURAH, TAGS, 1, 1)).toEqual({
      pos: 1,
      root: 4,
      lemma: 1,
      segments: [
        { text: 'قَالُ', tag: 'V|PERF|VF:1|3MP' },
        { text: 'وٓا۟', tag: 'N|PRON|SUFF|3MP' },
      ],
    });
  });

  it('gives a word without a root a null root and its particle lemma', () => {
    expect(wordAt(SURAH, TAGS, 1, 2)).toMatchObject({ root: null, lemma: 3 });
  });

  it('resolves the second word of a joined pair to the first', () => {
    expect(wordAt(SURAH, TAGS, 2, 2)).toMatchObject({ pos: 1, root: 7 });
  });

  it('returns null for a missing word', () => {
    expect(wordAt(SURAH, TAGS, 3, 1)).toBeNull();
    expect(wordAt(SURAH, TAGS, 1, 9)).toBeNull();
  });
});
