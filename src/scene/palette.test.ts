import { describe, expect, it } from 'vitest';
import { CLUSTER_PALETTE, clusterColor } from './palette';

describe('clusterColor', () => {
  it('has 12 distinct palette colors', () => {
    expect(CLUSTER_PALETTE).toHaveLength(12);
    expect(new Set(CLUSTER_PALETTE).size).toBe(12);
  });

  it('returns linear RGB in 0..1 for a cluster', () => {
    const c = clusterColor(0);
    expect(c).toHaveLength(3);
    for (const v of c) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('wraps cluster ids beyond the palette and handles negatives', () => {
    expect(clusterColor(12)).toEqual(clusterColor(0));
    expect(clusterColor(-1)).toEqual(clusterColor(11));
  });
});
