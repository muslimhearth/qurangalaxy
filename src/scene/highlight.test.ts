import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency } from './neighbors';
import { focusOf, starColors, edgeColors } from './highlight';

const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
const base = new Float32Array(fixtureGalaxy.roots.length * 3).fill(0.5);

describe('focusOf', () => {
  it('is null with no selection and no hover', () => {
    expect(focusOf(null, null)).toBeNull();
  });
  it('prefers the selection over the hover', () => {
    expect(focusOf(2, 3)).toEqual({ id: 2, strong: true });
    expect(focusOf(null, 3)).toEqual({ id: 3, strong: false });
  });
});

describe('starColors', () => {
  it('copies base colors when nothing is focused', () => {
    expect(Array.from(starColors(base, adj, null))).toEqual(Array.from(base));
  });

  it('brightens the focus, keeps neighbors, dims the rest', () => {
    const c = starColors(base, adj, { id: 0, strong: true });
    expect(c[0]).toBeGreaterThan(0.5); // focus root
    expect(c[1 * 3]).toBeCloseTo(0.5); // neighbor
    expect(c[3 * 3]).toBeLessThan(0.2); // unrelated root, strong dim
  });

  it('dims less on hover than on selection', () => {
    const sel = starColors(base, adj, { id: 0, strong: true });
    const hov = starColors(base, adj, { id: 0, strong: false });
    expect(hov[3 * 3]!).toBeGreaterThan(sel[3 * 3]!);
  });
});

describe('edgeColors', () => {
  const edges = fixtureGalaxy.edges;

  it('gives every edge a faint base color', () => {
    const c = edgeColors(edges, base, null);
    expect(c).toHaveLength(edges.length * 6);
    expect(c[0]).toBeGreaterThan(0);
    expect(c[0]).toBeLessThan(0.5);
  });

  it('makes edges of the focus bright and other edges darker', () => {
    const none = edgeColors(edges, base, null);
    const c = edgeColors(edges, base, { id: 0, strong: true });
    expect(c[0]!).toBeGreaterThan(none[0]!); // edge 0-1 touches root 0
    expect(c[5 * 6]!).toBeLessThan(none[5 * 6]!); // edge 4-5 does not
  });

  it('highlights less on hover than on selection', () => {
    const sel = edgeColors(edges, base, { id: 0, strong: true });
    const hov = edgeColors(edges, base, { id: 0, strong: false });
    expect(hov[0]!).toBeLessThan(sel[0]!);
    expect(hov[5 * 6]!).toBeGreaterThan(sel[5 * 6]!);
  });
});
