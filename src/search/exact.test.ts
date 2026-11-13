import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import type { Root } from '../data/types';
import { exactMatches, searchRoots } from './exact';

const ids = (q: string, limit?: number) => searchRoots(fixtureGalaxy.roots, q, limit).map((m) => m.id);

describe('searchRoots', () => {
  it('returns nothing for an empty query', () => {
    expect(ids('  ')).toEqual([]);
  });

  it('finds a root by transliteration without diacritics', () => {
    expect(ids('rhm')).toEqual([2]);
  });

  it('finds a root by Arabic letters, ignoring hamza form', () => {
    expect(ids('اله')[0]).toBe(1);
    expect(ids('رحم')[0]).toBe(2);
  });

  it('finds a root by one of its lemmas', () => {
    expect(ids('رحمن')).toContain(2);
    expect(ids('سماء')).toContain(0);
  });

  it('ranks exact matches first, then by count', () => {
    // "r" prefixes both r-ḥ-m (339) and r-b-b (980): higher count first.
    expect(ids('r')).toEqual([4, 2]);
    const roots: Root[] = [
      { ...fixtureGalaxy.roots[0]!, id: 0, tr: 'k-t-b-x', count: 900 },
      { ...fixtureGalaxy.roots[1]!, id: 1, tr: 'k-t-b', count: 10 },
    ];
    expect(searchRoots(roots, 'ktb').map((m) => m.id)).toEqual([1, 0]);
  });

  it('limits the number of results', () => {
    expect(ids('ا', 2)).toHaveLength(2);
  });
});

describe('exactMatches', () => {
  it('scores exact above prefix above contains, each between 0 and 1', () => {
    const roots: Root[] = [
      { ...fixtureGalaxy.roots[0]!, id: 0, tr: 'k-t-b' },
      { ...fixtureGalaxy.roots[1]!, id: 1, tr: 'k-t-b-x' },
      { ...fixtureGalaxy.roots[2]!, id: 2, tr: 'x-k-t-b' },
    ];
    const s = new Map(exactMatches(roots, 'ktb').map((m) => [m.id, m.score]));
    expect(s.get(0)).toBe(1);
    expect(s.get(1)!).toBeLessThan(1);
    expect(s.get(2)!).toBeLessThan(s.get(1)!);
    expect(s.get(2)!).toBeGreaterThan(0);
  });

  it('keeps one match per root: the best one', () => {
    // رحم matches its own letters exactly and its lemma رحمن by substring.
    const matches = exactMatches(fixtureGalaxy.roots, 'رحم').filter((m) => m.id === 2);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.score).toBe(1);
  });

  it('says what matched, so the UI can show it', () => {
    const m = exactMatches(fixtureGalaxy.roots, 'سماء').find((x) => x.id === 0)!;
    expect(m.reason.kind).toBe('arabic');
    expect(m.reason.text).toBe('سَمَآء');
  });
});
