import { describe, expect, it } from 'vitest';
import type { Occurrences, VerseKey } from '../../src/data/types';
import { buildEdges, linkScore, MIN_SHARED } from './edges';

/** Occurrences of one root in the given verses. */
const inVerses = (...keys: VerseKey[]) => keys.map((v) => ({ v, w: [1] }));

describe('linkScore', () => {
  it('is lift times log2(1 + shared verses)', () => {
    // 2 shared of 10 total; 4 and 5 verses: lift = 2*10/20 = 1, log2(3).
    expect(linkScore(2, 4, 5, 10)).toBeCloseTo(Math.log2(3));
    // lift = 4*100/(10*10) = 4; log2(5).
    expect(linkScore(4, 10, 10, 100)).toBeCloseTo(4 * Math.log2(5));
  });

  it('ranks a link between rare roots above the same count between common roots', () => {
    expect(linkScore(3, 5, 5, 1000)).toBeGreaterThan(linkScore(3, 500, 500, 1000));
  });

  it('lets more shared verses beat a 2-verse accident at equal lift', () => {
    // Both lifts are 100; 6 shared verses wins.
    expect(linkScore(6, 6, 10, 1000)).toBeGreaterThan(linkScore(2, 2, 10, 1000));
  });
});

describe('buildEdges', () => {
  // Root 0 in verses a,b,c; root 1 in a,b; root 2 in a; root 3 in d.
  const occ: Occurrences = [
    inVerses('1:1', '1:2', '1:3'),
    inVerses('1:1', '1:2'),
    inVerses('1:1'),
    inVerses('1:4'),
  ];
  const score = (shared: number, a: number, b: number) => Number(linkScore(shared, a, b, 4).toPrecision(3));

  it('layout edges weight each pair by shared verses, with source < target', () => {
    expect(buildEdges(occ, 8, 4).layout).toEqual([
      { source: 0, target: 1, weight: 2, score: score(2, 3, 2) },
      { source: 0, target: 2, weight: 1, score: score(1, 3, 1) },
      { source: 1, target: 2, weight: 1, score: score(1, 2, 1) },
    ]);
  });

  it('layout edges keep the union of each root top-k by weight, ties going to the lower id', () => {
    // k=1: root 0 keeps 0-1, root 1 keeps 0-1, root 2 ties 0-2/1-2 and keeps 0-2.
    expect(buildEdges(occ, 1, 4).layout.map((e) => [e.source, e.target])).toEqual([
      [0, 1],
      [0, 2],
    ]);
  });

  it(`links need ${MIN_SHARED} shared verses`, () => {
    expect(buildEdges(occ, 8, 4).links).toEqual([{ source: 0, target: 1, weight: 2, score: score(2, 3, 2) }]);
  });

  it('links keep each root top-k by score, not by weight', () => {
    // Root 0 is common (verses 1..10). Root 0 shares 3 verses with root 1 (score 3); roots 1 and 2
    // share 2 (score 3.96). Root 2 prefers root 3 (score 7.9), so only root 1 can keep 1-2.
    const common = inVerses('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7', '1:8', '1:9', '1:10');
    const occ2: Occurrences = [
      common,
      inVerses('1:1', '1:2', '1:3', '2:1'),
      inVerses('1:1', '2:1', '3:1', '3:2'),
      inVerses('3:1', '3:2'),
    ];
    const { links } = buildEdges(occ2, 1, 20);
    expect(links.map((e) => [e.source, e.target, e.weight])).toEqual([
      [0, 1, 3],
      [1, 2, 2],
      [2, 3, 2],
    ]);
  });
});
