import { describe, expect, it } from 'vitest';
import { cosineScores, topK } from './similarity';

describe('cosineScores', () => {
  it('scores each int8 row against a float query', () => {
    // Rows stand for (1,0), (0,1) and (0.6,0.8) at scale 100.
    const matrix = new Int8Array([100, 0, 0, 100, 60, 80]);
    const scores = cosineScores(new Float32Array([1, 0]), matrix, 100, 2);
    expect(scores[0]).toBeCloseTo(1);
    expect(scores[1]).toBeCloseTo(0);
    expect(scores[2]).toBeCloseTo(0.6);
  });

  it('rejects a query of the wrong length', () => {
    expect(() => cosineScores(new Float32Array(3), new Int8Array(4), 1, 2)).toThrow(/dims/);
  });
});

describe('topK', () => {
  it('returns the indices of the k highest scores, best first', () => {
    expect(topK(new Float32Array([0.1, 0.9, 0.5, 0.7]), 3)).toEqual([1, 3, 2]);
  });

  it('returns every index when k is larger than the list', () => {
    expect(topK(new Float32Array([0.2, 0.4]), 5)).toEqual([1, 0]);
  });

  it('breaks ties by lower index', () => {
    expect(topK(new Float32Array([0.5, 0.5, 0.5]), 2)).toEqual([0, 1]);
  });
});
