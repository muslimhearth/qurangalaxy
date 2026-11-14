import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import { blendMatches, meaningWeight } from './blend';
import type { Match } from './types';

const roots = fixtureGalaxy.roots;
const exact: Match[] = [
  { id: 2, score: 1, reason: { kind: 'latin', text: 'rhm' } },
  { id: 4, score: 0.6, reason: { kind: 'latin', text: 'rbb' } },
];
const semantic: Match[] = [
  { id: 3, score: 1, reason: { kind: 'semantic', text: 'praise' }, verses: ['1:2'] },
  { id: 2, score: 0.5, reason: { kind: 'semantic', text: 'praise' }, verses: ['1:1', '1:3'] },
];

describe('blendMatches', () => {
  it('returns the exact results unchanged at weight 0', () => {
    expect(blendMatches(roots, exact, semantic, 0, 8)).toEqual(exact);
  });

  it('returns only semantic results at weight 1', () => {
    expect(blendMatches(roots, exact, semantic, 1, 8)).toEqual(semantic);
  });

  it('mixes scores as w × semantic + (1 − w) × exact', () => {
    const out = blendMatches(roots, exact, semantic, 0.5, 8);
    expect(out.map((m) => [m.id, m.score])).toEqual([
      [2, 0.75],
      [3, 0.5],
      [4, 0.3],
    ]);
  });

  it('keeps the matching verses and uses the reason of the bigger share', () => {
    const out = blendMatches(roots, exact, semantic, 0.5, 8);
    expect(out[0]).toMatchObject({ reason: { kind: 'latin' }, verses: ['1:1', '1:3'] });
    expect(out[1]).toMatchObject({ reason: { kind: 'semantic' }, verses: ['1:2'] });
  });

  it('breaks ties by word count and keeps the first `limit`', () => {
    const a: Match = { id: 0, score: 1, reason: { kind: 'arabic', text: 'x' } };
    const b: Match = { id: 1, score: 1, reason: { kind: 'semantic', text: 'x' } };
    // At w = 0.5 both score 0.5; root 1 (أله) has more words than root 0.
    expect(blendMatches(roots, [a], [b], 0.5, 1).map((m) => m.id)).toEqual([1]);
  });
});

describe('meaningWeight', () => {
  it('keeps the slider weight for Latin queries and gives 0 for Arabic ones', () => {
    expect(meaningWeight('patience', 0.7)).toBe(0.7);
    expect(meaningWeight('ظهورها', 0.7)).toBe(0);
    expect(meaningWeight('', 0.7)).toBe(0.7);
  });
});
