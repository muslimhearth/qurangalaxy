import { describe, expect, it } from 'vitest';
import { JOINED_WORDS, checkJoinedWords, toTextPosition } from './wordmap';

describe('toTextPosition', () => {
  it('keeps positions in verses without a joined word', () => {
    expect(toTextPosition('1:1', 4)).toBe(4);
  });

  it('keeps positions up to and including the joined word', () => {
    // 2:181 corpus word 3 is بَعْدَمَا = Tanzil words 3-4 (بَعْدَ مَا); the root is in word 3.
    expect(toTextPosition('2:181', 2)).toBe(2);
    expect(toTextPosition('2:181', 3)).toBe(3);
  });

  it('shifts positions after the joined word by one', () => {
    expect(toTextPosition('2:181', 4)).toBe(5);
    expect(toTextPosition('13:37', 19)).toBe(20);
  });
});

describe('checkJoinedWords', () => {
  it('accepts mismatches that the table explains', () => {
    const mismatches = Object.keys(JOINED_WORDS).map((verse) => ({ verse, text: 5, corpus: 4 }));
    expect(() => checkJoinedWords(mismatches as never)).not.toThrow();
  });

  it('rejects a mismatch the table does not know', () => {
    expect(() => checkJoinedWords([{ verse: '9:9', text: 5, corpus: 4 }])).toThrow(/9:9/);
  });

  it('rejects a known verse whose counts differ by more than one', () => {
    expect(() => checkJoinedWords([{ verse: '8:6', text: 13, corpus: 11 }])).toThrow(/8:6/);
  });
});
