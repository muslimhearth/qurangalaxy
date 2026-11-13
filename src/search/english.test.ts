import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import type { Root } from '../data/types';
import { englishMatcher, englishStem } from './english';
import { exactMatches, rankMatches } from './exact';
import { TIER } from './types';

const base = fixtureGalaxy.roots[0]!;
const root = (id: number, en: string[], lemmaEn: string[][] = [], count = 10): Root => ({
  ...base,
  id,
  count,
  en,
  lemmas: lemmaEn.map((e, i) => ({ ar: `x${i}`, count: 1, en: e })),
});

const roots: Root[] = [
  root(0, ['light'], [['fire'], ['light', 'radiance']], 194),
  root(1, ['fire', 'flame'], [], 20),
  root(2, ['day'], [['day', 'Judgment Day']], 475),
  root(3, ['mercy'], [['merciful'], ['most merciful']], 339),
  root(4, ['twilight'], [], 2),
  root(5, ['to know'], [['knowledge']], 854),
];

const byId = (q: string) => new Map(englishMatcher(roots, q).map((m) => [m.id, m]));

describe('englishStem', () => {
  it('merges plurals and common derived forms', () => {
    expect(englishStem('lights')).toBe(englishStem('light'));
    expect(englishStem('merciful')).toBe(englishStem('mercy'));
    expect(englishStem('patience')).toBe(englishStem('patient'));
    expect(englishStem('skies')).toBe(englishStem('sky'));
    expect(englishStem('sea')).toBe('sea');
  });
});

describe('englishMatcher', () => {
  it('returns nothing for Arabic or empty queries', () => {
    expect(englishMatcher(roots, 'نور')).toEqual([]);
    expect(englishMatcher(roots, '  ')).toEqual([]);
  });

  it('scores a whole-word meaning as exact and says which meaning matched', () => {
    const m = byId('Light').get(0)!;
    expect(m.score).toBe(TIER.exact);
    expect(m.reason).toEqual({ kind: 'english', text: 'light' });
  });

  it('ranks root meanings slightly above lemma meanings', () => {
    const m = byId('fire');
    expect(m.get(1)!.score).toBeGreaterThan(m.get(0)!.score);
    expect(m.get(0)!.score).toBeGreaterThan(TIER.prefix);
  });

  it('matches a word inside a longer meaning as a whole word', () => {
    expect(byId('day').get(2)!.score).toBe(TIER.exact);
    expect(byId('know').get(5)!.score).toBeGreaterThan(TIER.prefix);
  });

  it('scores stem matches as prefix and substrings as contains', () => {
    const lights = byId('lights');
    expect(lights.get(0)!.score).toBeCloseTo(TIER.prefix, 1);
    expect(byId('merciful').get(3)!.score).toBeGreaterThan(byId('mercy').get(3)!.score - 0.1);
    expect(byId('light').get(4)!.score).toBeCloseTo(TIER.contains, 1);
  });

  it('puts the right root first after ranking', () => {
    expect(rankMatches(roots, exactMatches(roots, 'light', [englishMatcher]), 8)[0]!.id).toBe(0);
    expect(rankMatches(roots, exactMatches(roots, 'day', [englishMatcher]), 8)[0]!.id).toBe(2);
  });
});
