import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../../data/fixture';
import { edgePositions, starMatrices } from '../buffers';
import { buildAdjacency } from '../neighbors';
import { Glide } from './glide';
import { writeEdgeEnds, writeStarPositions } from './apply';

const { roots, edges } = fixtureGalaxy;
const adj = buildAdjacency(roots.length, edges);
const home = new Float32Array(roots.flatMap((r) => r.pos));

/** A glide where root 2 has jumped to (1, 2, 3). */
function moved() {
  const g = new Glide(home, 0);
  g.setTargets([2], new Float32Array([1, 2, 3]));
  g.step(0);
  return g;
}

describe('writeStarPositions', () => {
  it('moves only the translation of the moved stars', () => {
    const m = starMatrices(roots, new Float32Array(roots.length).fill(2));
    const before = m.slice();
    writeStarPositions(m, moved());
    expect(Array.from(m.subarray(2 * 16 + 12, 2 * 16 + 15))).toEqual([1, 2, 3]);
    expect(m[2 * 16]).toBe(2); // scale kept
    expect(Array.from(m.subarray(0, 32))).toEqual(Array.from(before.subarray(0, 32)));
  });
});

describe('writeEdgeEnds', () => {
  it('moves the line ends at the moved stars, on whichever side they are', () => {
    const p = edgePositions(roots, edges);
    writeEdgeEnds(p, edges, adj, moved());
    // Edge 1 is 0-2 (root 2 is the target end); edge 2 is 1-2.
    expect(Array.from(p.subarray(1 * 6 + 3, 1 * 6 + 6))).toEqual([1, 2, 3]);
    expect(Array.from(p.subarray(2 * 6 + 3, 2 * 6 + 6))).toEqual([1, 2, 3]);
    expect(Array.from(p.subarray(1 * 6, 1 * 6 + 3))).toEqual(roots[0]!.pos);
    // Edge 5 (4-5) does not touch root 2.
    expect(Array.from(p.subarray(5 * 6, 5 * 6 + 6))).toEqual([...roots[4]!.pos, ...roots[5]!.pos]);
  });
});
