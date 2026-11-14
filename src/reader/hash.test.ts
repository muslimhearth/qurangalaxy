import { describe, expect, it } from 'vitest';
import { hashForReader, parseReaderHash } from './hash';

describe('reader hash', () => {
  it('writes "#/surah/<s>/<v>"', () => {
    expect(hashForReader({ surah: 2, verse: 17 })).toBe('#/surah/2/17');
  });

  it('reads a surah and verse; a bare surah opens at verse 1', () => {
    expect(parseReaderHash('#/surah/2/17')).toEqual({ surah: 2, verse: 17 });
    expect(parseReaderHash('#/surah/114')).toEqual({ surah: 114, verse: 1 });
  });

  it('rejects other hashes and places that do not exist', () => {
    expect(parseReaderHash('#/verse/2:17')).toBeNull();
    expect(parseReaderHash('#/surah/115/1')).toBeNull();
    expect(parseReaderHash('#/surah/1/8')).toBeNull();
    expect(parseReaderHash('#/surah/x/1')).toBeNull();
    expect(parseReaderHash('')).toBeNull();
  });
});
