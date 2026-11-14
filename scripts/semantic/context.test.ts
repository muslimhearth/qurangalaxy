import { describe, expect, it } from 'vitest';
import type { VerseKey } from '../../src/data/types';
import { lengthFactors, mixNeighbours, wordCount } from './context';

const v = (...xs: number[]) => Float32Array.from(xs);
const keys: VerseKey[] = ['1:1', '1:2', '1:3', '2:1'];
const vectors = [v(1, 0, 0), v(0, 1, 0), v(0, 0, 1), v(1, 1, 0)];

describe('mixNeighbours', () => {
  it('keeps vectors as they are at self weight 1', () => {
    const out = mixNeighbours(keys, vectors, () => 1);
    expect(Array.from(out[1]!)).toEqual([0, 1, 0]);
  });

  it('adds the mean of the neighbours in the same surah, then normalizes', () => {
    const out = mixNeighbours(keys, vectors, () => 0.5);
    // 1:2 = 0.5 × (0,1,0) + 0.5 × mean((1,0,0), (0,0,1)) = (0.25, 0.5, 0.25)
    const n = Math.hypot(0.25, 0.5, 0.25);
    expect(Array.from(out[1]!).map((x) => x.toFixed(4))).toEqual([0.25 / n, 0.5 / n, 0.25 / n].map((x) => x.toFixed(4)));
  });

  it('uses only the neighbour inside the surah at surah edges', () => {
    const out = mixNeighbours(keys, vectors, () => 0.5);
    // 1:3 has only 1:2 (2:1 is another surah): (0, 0.5, 0.5)
    expect(Array.from(out[2]!).map((x) => x.toFixed(4))).toEqual(['0.0000', '0.7071', '0.7071']);
    // 2:1 has no neighbour: unchanged direction
    expect(Array.from(out[3]!).map((x) => x.toFixed(4))).toEqual(['0.7071', '0.7071', '0.0000']);
  });

  it('asks for the self weight of each verse by index', () => {
    const seen: number[] = [];
    mixNeighbours(keys, vectors, (i) => (seen.push(i), 1));
    expect(seen).toEqual([0, 1, 2, 3]);
  });
});

describe('wordCount', () => {
  it('counts words, ignoring brackets and punctuation', () => {
    expect(wordCount('Of the living and the dead?')).toBe(6);
    expect(wordCount('For indeed, with hardship [will be] ease.')).toBe(7);
  });
});

describe('lengthFactors', () => {
  it('is 1 for verses with at least `words` words', () => {
    expect(lengthFactors([12, 30], { words: 12, power: 0.5 })).toEqual([1, 1]);
  });

  it('shrinks shorter verses by (count / words) ^ power', () => {
    expect(lengthFactors([3], { words: 12, power: 0.5 })[0]).toBeCloseTo(0.5);
  });

  it('is 1 for every verse at power 0', () => {
    expect(lengthFactors([1, 2], { words: 12, power: 0 })).toEqual([1, 1]);
  });
});
