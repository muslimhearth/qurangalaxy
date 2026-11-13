import { describe, expect, it } from 'vitest';
import { PHRASE_WORDS, phraseLines } from './phrase';

describe('phraseLines', () => {
  it('keeps the words on one line on wide screens', () => {
    expect(phraseLines(16 / 9)).toEqual([`${PHRASE_WORDS[0]} ${PHRASE_WORDS[1]}`]);
  });
  it('stacks the words on phones, first word on top', () => {
    expect(phraseLines(0.46)).toEqual([PHRASE_WORDS[0], PHRASE_WORDS[1]]);
  });
});
