import { describe, expect, it } from 'vitest';
import { hashForVerse, parseVerseHash } from './hash';

describe('verse hash', () => {
  it('writes and reads #/verse/s:v', () => {
    expect(hashForVerse('3:109')).toBe('#/verse/3:109');
    expect(parseVerseHash('#/verse/3:109')).toBe('3:109');
    expect(parseVerseHash('#/verse/3%3A109')).toBe('3:109');
  });

  it('rejects other hashes and verses that do not exist', () => {
    for (const h of ['', '#/root/x', '#/verse/1:8', '#/verse/115:1', '#/verse/abc', '#/verse/%E0']) {
      expect(parseVerseHash(h)).toBeNull();
    }
  });
});
