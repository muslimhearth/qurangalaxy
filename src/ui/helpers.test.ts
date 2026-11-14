import { describe, expect, it } from 'vitest';
import { hashForRoot, neighbors, parseRootHash, verseWords } from './helpers';
import { fixtureGalaxy } from '../data/fixture';

describe('neighbors', () => {
  it('lists connected roots, strongest link first', () => {
    const result = neighbors(fixtureGalaxy, 1).map((n) => [n.root.id, n.weight, n.score]);
    expect(result).toEqual([
      [0, 3, 1.2],
      [2, 3, 0.9],
      [4, 1, 0.3],
    ]);
  });

  it('ranks by score, not by shared verses', () => {
    // Root 0 shares 3 verses with root 1 but 2 with root 2, which scores higher.
    expect(neighbors(fixtureGalaxy, 0).map((n) => n.root.id)).toEqual([2, 1]);
  });

  it('breaks equal scores by word count', () => {
    const edges = [
      { source: 0, target: 3, weight: 2, score: 1 },
      { source: 0, target: 2, weight: 2, score: 1 },
    ];
    // r-ḥ-m 339 words beats ḥ-m-d 68.
    expect(neighbors({ ...fixtureGalaxy, edges }, 0).map((n) => n.root.id)).toEqual([2, 3]);
  });

  it('returns an empty list for a root without links', () => {
    expect(neighbors({ ...fixtureGalaxy, edges: [] }, 1)).toEqual([]);
  });
});

describe('verseWords', () => {
  it('marks the words of a second root as alt', () => {
    expect(verseWords('a b c', [1], [3])).toEqual([
      { text: 'a', hit: true },
      { text: 'b', hit: false },
      { text: 'c', hit: false, alt: true },
    ]);
  });

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
