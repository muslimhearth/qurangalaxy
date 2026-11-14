import { describe, expect, it } from 'vitest';
import { blendVerseMatches } from './blend';
import type { VerseMatch } from './exact';

const exact: VerseMatch[] = [
  { key: '2:153', score: 1, source: 'en' },
  { key: '2:155', score: 0.5, source: 'tr' },
];
const semantic = [
  { key: '2:155' as const, sim: 0.6 },
  { key: '39:10' as const, sim: 0.3 },
];

describe('blendVerseMatches', () => {
  it('keeps the exact ranking at weight 0', () => {
    expect(blendVerseMatches(exact, semantic, 0, 10)).toEqual(exact);
  });

  it('uses only meaning at weight 1, scaled so the best verse scores 1', () => {
    expect(blendVerseMatches(exact, semantic, 1, 10)).toEqual([
      { key: '2:155', score: 1, source: 'tr' },
      { key: '39:10', score: 0.5, source: 'semantic' },
    ]);
  });

  it('mixes both sides by the weight', () => {
    const out = blendVerseMatches(exact, semantic, 0.5, 10);
    expect(out.map((m) => m.key)).toEqual(['2:155', '2:153', '39:10']);
    expect(out[0]!.score).toBeCloseTo(0.75);
  });

  it('stops at the limit', () => {
    expect(blendVerseMatches(exact, semantic, 0.5, 2)).toHaveLength(2);
  });
});
