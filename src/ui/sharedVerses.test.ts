import { describe, expect, it } from 'vitest';
import { sharedOccurrences } from './sharedVerses';

describe('sharedOccurrences', () => {
  it('keeps the first root occurrences in verses that also hold the second root, in order', () => {
    const a = [
      { v: '1:1' as const, w: [1] },
      { v: '1:2' as const, w: [2] },
      { v: '2:5' as const, w: [3] },
    ];
    const b = [
      { v: '2:5' as const, w: [1] },
      { v: '1:1' as const, w: [4] },
      { v: '3:1' as const, w: [1] },
    ];
    expect(sharedOccurrences(a, b)).toEqual([a[0], a[2]]);
    expect(sharedOccurrences(a, [])).toEqual([]);
  });
});
