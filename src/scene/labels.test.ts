import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency, topByCount, TOP_LINKS } from './neighbors';
import { declutter, LABEL_LIFT, labelBox, labelIds, ndcToScreen } from './labels';

const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
const top = topByCount(fixtureGalaxy.roots, 1); // [1]

describe('ndcToScreen', () => {
  it('maps the view center to the screen center', () => {
    expect(ndcToScreen(0, 0, 0.5, 800, 600)).toEqual({ x: 400, y: 300, visible: true });
  });
  it('maps NDC top-left to pixel 0,0', () => {
    expect(ndcToScreen(-1, 1, 0, 800, 600)).toMatchObject({ x: 0, y: 0 });
  });
  it('hides points behind the camera', () => {
    expect(ndcToScreen(0, 0, 1.2, 800, 600).visible).toBe(false);
  });
});

describe('labelIds', () => {
  it('shows only the top roots when nothing is focused', () => {
    expect(labelIds(adj, top, null, null)).toEqual([1]);
  });

  it('adds the hovered root, its neighbors and the top roots, without duplicates', () => {
    expect(labelIds(adj, top, null, 5).sort()).toEqual([1, 4, 5]);
  });

  it('labels only the focus ring while a root is selected, not the frequent roots', () => {
    expect(labelIds(adj, top, 3, 5).sort()).toEqual([3, 4, 5]);
  });

  it('caps the number of neighbor labels per focus root', () => {
    expect(labelIds(adj, [], 1, null, 2)).toEqual([1, 0, 2]);
  });

  it('labels by default exactly the strongest links that light up (TOP_LINKS)', () => {
    const hub = buildAdjacency(40, Array.from({ length: 39 }, (_, i) => ({ source: 0, target: i + 1, weight: 40 - i, score: 40 - i })));
    expect(labelIds(hub, [], 0, null)).toHaveLength(TOP_LINKS + 1);
  });
});

describe('labelIds order', () => {
  it('puts the selected and hovered roots before any neighbor', () => {
    const ids = labelIds(adj, top, 1, 5);
    expect(ids.slice(0, 2)).toEqual([1, 5]);
  });
});

describe('labelBox', () => {
  it('centers the box above the anchor point', () => {
    expect(labelBox({ x: 100, y: 50 }, { w: 40, h: 20 })).toEqual({ x: 80, y: 30, w: 40, h: 20 });
  });
});

describe('declutter', () => {
  const box = (x: number, y: number) => ({ x, y, w: 40, h: 20 });

  it('keeps boxes that do not overlap', () => {
    expect(declutter([box(0, 0), box(100, 0)], [])).toEqual([true, true]);
  });

  it('hides a later box that overlaps an earlier one, so priority wins', () => {
    expect(declutter([box(0, 0), box(20, 10), box(60, 0)], [])).toEqual([true, false, true]);
  });

  it('hides boxes under a blocked area such as the side panel', () => {
    expect(declutter([box(0, 0), box(500, 0)], [{ x: 400, y: 0, w: 400, h: 600 }])).toEqual([true, false]);
  });

  it('skips missing boxes (labels behind the camera)', () => {
    expect(declutter([null, box(0, 0)], [])).toEqual([false, true]);
  });

  it('leaves a small gap between labels', () => {
    // Touching boxes count as overlapping because of the gap.
    expect(declutter([box(0, 0), box(41, 0)], [])).toEqual([true, false]);
  });
});

describe('LABEL_LIFT', () => {
  it('puts a label just above the top edge of its star', () => {
    expect(LABEL_LIFT).toBeGreaterThan(1);
    expect(LABEL_LIFT).toBeLessThan(1.5);
  });
});
