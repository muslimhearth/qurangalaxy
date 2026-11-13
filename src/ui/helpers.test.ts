import { describe, expect, it } from 'vitest';
import { hashForRoot, neighbors, parseRootHash, verseWords } from './helpers';
import { fixtureGalaxy } from '../data/fixture';

describe('neighbors', () => {
  it('lists connected roots, strongest link first', () => {
    const result = neighbors(fixtureGalaxy, 1).map((n) => [n.root.id, n.weight]);
    // Ties (weight 3) break by word count: r-ḥ-m 339 < s-m-w 381.
    expect(result).toEqual([
      [0, 3],
      [2, 3],
      [4, 1],
    ]);
  });

  it('returns an empty list for a root without links', () => {
    expect(neighbors({ ...fixtureGalaxy, edges: [] }, 1)).toEqual([]);
  });
});

describe('verseWords', () => {
  it('splits on single spaces and marks 1-based positions', () => {
    expect(verseWords('a b c d', [2, 4])).toEqual([
      { text: 'a', hit: false },
      { text: 'b', hit: true },
      { text: 'c', hit: false },
      { text: 'd', hit: true },
    ]);
  });
});

describe('root hash', () => {
  const roots = fixtureGalaxy.roots;

  it('builds a hash from the Arabic root', () => {
    expect(hashForRoot(roots[2]!)).toBe('#/root/' + encodeURIComponent('رحم'));
  });

  it('parses encoded and plain hashes', () => {
    expect(parseRootHash('#/root/' + encodeURIComponent('رحم'), roots)).toBe(2);
    expect(parseRootHash('#/root/أله', roots)).toBe(1);
  });

  it('returns null for unknown or empty hashes', () => {
    expect(parseRootHash('', roots)).toBeNull();
    expect(parseRootHash('#/root/xyz', roots)).toBeNull();
    expect(parseRootHash('#/other', roots)).toBeNull();
    expect(parseRootHash('#/root/%E0%A4%A', roots)).toBeNull();
  });
});
