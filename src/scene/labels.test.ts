import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { buildAdjacency, topByCount } from './neighbors';
import { labelIds } from './labels';

const adj = buildAdjacency(fixtureGalaxy.roots.length, fixtureGalaxy.edges);
const top = topByCount(fixtureGalaxy.roots, 1); // [1]

describe('labelIds', () => {
  it('shows only the top roots when nothing is focused', () => {
    expect(labelIds(adj, top, null, null)).toEqual([1]);
  });

  it('adds the selected root, the hovered root and their neighbors, without duplicates', () => {
    const ids = labelIds(adj, top, 3, 5);
    expect(ids.sort()).toEqual([1, 3, 4, 5]);
  });

  it('caps the number of neighbor labels per focus root', () => {
    expect(labelIds(adj, [], 1, null, 2)).toEqual([1, 0, 2]);
  });
});
