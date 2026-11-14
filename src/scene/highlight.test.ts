import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency } from './neighbors';
import { edgeBaseLevel, edgeColors, focusOf, linkScoreLevel, starColors } from './highlight';
import { TOP_LINKS } from './neighbors';

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

  it('dims neighbors past the link cap more than the strongest neighbors', () => {
    const n = TOP_LINKS + 3;
    const hub = Array.from({ length: n - 1 }, (_, i) => ({ source: 0, target: i + 1, weight: n - i, score: n - i }));
    const hubAdj = buildAdjacency(n, hub);
    const c = starColors(new Float32Array(n * 3).fill(0.5), hubAdj, { id: 0, strong: true });
    expect(c[1 * 3]).toBeCloseTo(0.5); // strongest neighbor keeps its color
    // A neighbor past the cap dims a little, but stays clearly visible.
    expect(c[(n - 1) * 3]!).toBeLessThan(0.5 * 0.8);
    expect(c[(n - 1) * 3]!).toBeGreaterThanOrEqual(0.5 * 0.6);
  });

  it('brightens the focus, keeps neighbors, dims the rest', () => {
    const c = starColors(base, adj, { id: 0, strong: true });
    expect(c[0]).toBeGreaterThan(0.5); // focus root
    expect(c[1 * 3]).toBeCloseTo(0.5); // neighbor
    expect(c[3 * 3]).toBeLessThan(0.2); // unrelated root, strong dim
  });

  it('keeps every connected root clearly brighter than unrelated roots', () => {
    const n = TOP_LINKS + 3;
    const hub = Array.from({ length: n - 2 }, (_, i) => ({ source: 0, target: i + 1, weight: n - i, score: n - i }));
    const hubAdj = buildAdjacency(n, hub);
    const c = starColors(new Float32Array(n * 3).fill(0.5), hubAdj, { id: 0, strong: true });
    const weakestNeighbor = c[(n - 2) * 3]!; // past the link cap
    const unrelated = c[(n - 1) * 3]!;
    expect(weakestNeighbor / unrelated).toBeGreaterThanOrEqual(8);
  });

  it('dims less on hover than on selection', () => {
    const sel = starColors(base, adj, { id: 0, strong: true });
    const hov = starColors(base, adj, { id: 0, strong: false });
    expect(hov[3 * 3]!).toBeGreaterThan(sel[3 * 3]!);
  });
});

describe('edgeBaseLevel', () => {
  it('keeps few edges clearly visible', () => {
    expect(edgeBaseLevel(6)).toBeCloseTo(0.14);
  });
  it('makes edges fainter when there are many, so the core does not wash out', () => {
    expect(edgeBaseLevel(10000)).toBeLessThan(0.03);
    expect(edgeBaseLevel(10000)).toBeGreaterThan(0.005);
  });
});

describe('edgeColors', () => {
  const edges = fixtureGalaxy.edges;

  it('gives every edge a faint base color', () => {
    const c = edgeColors(edges, base, adj, null);
    expect(c).toHaveLength(edges.length * 6);
    expect(c[0]).toBeGreaterThan(0);
    expect(c[0]).toBeLessThan(0.5);
  });

  it('makes edges of the focus bright and other edges darker', () => {
    const none = edgeColors(edges, base, adj, null);
    const c = edgeColors(edges, base, adj, { id: 0, strong: true });
    expect(c[0]!).toBeGreaterThan(none[0]!); // edge 0-1 touches root 0
    expect(c[5 * 6]!).toBeLessThan(none[5 * 6]!); // edge 4-5 does not
  });

  it('highlights less on hover than on selection', () => {
    const sel = edgeColors(edges, base, adj, { id: 0, strong: true });
    const hov = edgeColors(edges, base, adj, { id: 0, strong: false });
    expect(hov[0]!).toBeLessThan(sel[0]!);
    expect(hov[5 * 6]!).toBeGreaterThan(sel[5 * 6]!);
  });

  it('lights only the strongest links of a hub, brighter for a higher score', () => {
    // Root 0 linked to 1..40 with score 40 - i: neighbor 1 is the strongest. Weights run the other
    // way, so the test shows that score, not shared verses, sets the order and brightness.
    const n = 41;
    const hub = Array.from({ length: n - 1 }, (_, i) => ({ source: 0, target: i + 1, weight: i + 1, score: n - 1 - i }));
    const hubAdj = buildAdjacency(n, hub);
    const hubBase = new Float32Array(n * 3).fill(0.5);
    const c = edgeColors(hub, hubBase, hubAdj, { id: 0, strong: true });
    const level = (edge: number) => c[edge * 6]!;
    const none = edgeColors(hub, hubBase, hubAdj, null);
    // The strongest link is the brightest; brightness falls with the score.
    expect(level(0)).toBeGreaterThan(level(TOP_LINKS - 1));
    // Links past the cap are weaker than the dimmest possible bright link (level 0.3), but clearly
    // visible: an absolute level, not a share of the (tiny, for real data) default level.
    expect(level(TOP_LINKS)).toBeLessThan(0.5 * 0.3 * 0.7);
    expect(level(TOP_LINKS)).toBeGreaterThan(0.5 * 0.12);
    expect(level(TOP_LINKS)).toBeGreaterThan(none[TOP_LINKS * 6]!);
    expect(level(n - 2)).toBeCloseTo(level(TOP_LINKS));
  });
});

describe('linkScoreLevel', () => {
  it('is 1 for the strongest link and stays clearly visible for weak ones', () => {
    expect(linkScoreLevel(10, 10)).toBe(1);
    expect(linkScoreLevel(1, 100)).toBeGreaterThan(0.25);
    // Scores are not whole numbers: a small strongest score still maps to 1.
    expect(linkScoreLevel(0.4, 0.4)).toBe(1);
    expect(linkScoreLevel(25, 100)).toBeLessThan(linkScoreLevel(50, 100));
  });
});
