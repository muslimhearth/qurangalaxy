import { describe, expect, it } from 'vitest';
import { firstHitRank, recallAt, summarize } from './metrics';

describe('firstHitRank', () => {
  it('gives the 1-based rank of the first expected item', () => {
    expect(firstHitRank(['a', 'b', 'c'], ['c', 'b'])).toBe(2);
  });

  it('gives null when nothing expected is found', () => {
    expect(firstHitRank(['a'], ['z'])).toBeNull();
  });
});

describe('summarize', () => {
  it('computes hit@1, hit@5 and mean reciprocal rank', () => {
    expect(summarize([1, 3, null, 10])).toEqual({ hit1: 0.25, hit5: 0.5, mrr: (1 + 1 / 3 + 0 + 0.1) / 4 });
  });
});

describe('recallAt', () => {
  it('gives the share of expected items in the first k results', () => {
    expect(recallAt(['a', 'b', 'c', 'd'], ['b', 'd', 'z'], 2)).toBeCloseTo(1 / 3);
    expect(recallAt(['a', 'b', 'c', 'd'], ['b', 'd'], 4)).toBe(1);
  });

  it('gives 0 when nothing is expected', () => {
    expect(recallAt(['a'], [], 1)).toBe(0);
  });
});
