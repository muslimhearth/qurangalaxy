import { describe, expect, it } from 'vitest';
import type { Occurrences } from '../data/types';
import { buildVerseRoots, rootWeights, versesToRoots } from './aggregate';

const occurrences: Occurrences = [
  // Root 0 is everywhere (like أله).
  [{ v: '1:1', w: [1] }, { v: '1:2', w: [1] }, { v: '1:3', w: [1] }, { v: '1:4', w: [1] }],
  // Root 1 is in two verses.
  [{ v: '1:1', w: [2] }, { v: '1:2', w: [2] }],
  // Root 2 is in one verse.
  [{ v: '1:4', w: [2] }],
];

describe('buildVerseRoots', () => {
  it('lists the roots of each verse', () => {
    const map = buildVerseRoots(occurrences);
    expect(map.get('1:1')).toEqual([0, 1]);
    expect(map.get('1:4')).toEqual([0, 2]);
  });
});

describe('rootWeights', () => {
  it('gives a root found in every verse no weight and rare roots more', () => {
    const w = rootWeights(occurrences, 4);
    expect(w[0]).toBe(0);
    expect(w[2]!).toBeGreaterThan(w[1]!);
    expect(w[2]).toBeCloseTo(1);
  });
});

describe('versesToRoots', () => {
  const verseRoots = buildVerseRoots(occurrences);
  const weights = rootWeights(occurrences, 4);

  it('sums verse similarities per root and scales the best root to 1', () => {
    const hits = [
      { key: '1:1' as const, sim: 0.8 },
      { key: '1:2' as const, sim: 0.7 },
    ];
    const matches = versesToRoots(hits, verseRoots, weights, 'mercy');
    expect(matches.map((m) => m.id)).toEqual([1]);
    expect(matches[0]!.score).toBe(1);
    expect(matches[0]!.reason).toEqual({ kind: 'semantic', text: 'mercy' });
  });

  it('keeps the ubiquitous root out even when it is in every hit', () => {
    const hits = [{ key: '1:4' as const, sim: 0.6 }];
    const ids = versesToRoots(hits, verseRoots, weights, 'q').map((m) => m.id);
    expect(ids).toEqual([2]);
  });

  it('ranks a root with many good verses above one with a single verse', () => {
    const hits = [
      { key: '1:1' as const, sim: 0.6 },
      { key: '1:2' as const, sim: 0.6 },
      { key: '1:4' as const, sim: 0.5 },
    ];
    // Root 1: (0.6 + 0.6) × 0.5 = 0.6. Root 2: 0.5 × 1 = 0.5.
    const matches = versesToRoots(hits, verseRoots, weights, 'q');
    expect(matches[0]!.id).toBe(1);
    expect(matches[1]!.score).toBeLessThan(1);
  });

  it('lists the best verses of each root, best first, at most two', () => {
    const hits = [
      { key: '1:2' as const, sim: 0.9 },
      { key: '1:1' as const, sim: 0.5 },
    ];
    const [m] = versesToRoots(hits, verseRoots, weights, 'q');
    expect(m!.verses).toEqual(['1:2', '1:1']);
  });

  it('returns nothing for no hits', () => {
    expect(versesToRoots([], verseRoots, weights, 'q')).toEqual([]);
  });
});
