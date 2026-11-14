import { describe, expect, it } from 'vitest';
import { DEFAULT_VERSE_WEIGHT, useVerseWeight } from './verseWeight';

describe('useVerseWeight', () => {
  it('starts hybrid and clamps to 0..1', () => {
    expect(useVerseWeight.getState().weight).toBe(DEFAULT_VERSE_WEIGHT);
    useVerseWeight.getState().setWeight(2);
    expect(useVerseWeight.getState().weight).toBe(1);
    useVerseWeight.getState().setWeight(-1);
    expect(useVerseWeight.getState().weight).toBe(0);
  });
});
