import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { drawnEdges } from './drawnEdges';
import { buildAdjacency } from './neighbors';

const { roots, edges } = fixtureGalaxy;
const adj = buildAdjacency(roots.length, edges);
const indices = (out: Uint32Array, n: number) => Array.from(out.subarray(0, n));

describe('drawnEdges', () => {
  it('draws every edge without a focus or on hover', () => {
    const out = new Uint32Array(edges.length * 2);
    expect(drawnEdges(edges.length, adj, null, out)).toBe(edges.length * 2);
    expect(indices(out, 4)).toEqual([0, 1, 2, 3]);
    expect(drawnEdges(edges.length, adj, { id: 0, strong: false }, out)).toBe(edges.length * 2);
  });

  it('draws only the edges of a selected root (the others are below one color step)', () => {
    const out = new Uint32Array(edges.length * 2);
    const n = drawnEdges(edges.length, adj, { id: 0, strong: true }, out);
    // Root 0 has edges 0 (0-1) and 1 (0-2): vertices 0,1 and 2,3.
    expect(indices(out, n).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });
});
