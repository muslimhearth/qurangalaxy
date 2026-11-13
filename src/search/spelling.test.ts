import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixtureGalaxy } from '../data/fixture';
import type { Galaxy } from '../data/types';
import { rankMatches, searchRoots } from './exact';
import { spellingMatcher } from './spelling';
import { TIER } from './types';

const galaxy = JSON.parse(readFileSync('public/data/galaxy.json', 'utf8')) as Galaxy;
const roots = galaxy.roots;

/** Top `n` roots (Arabic letters) found by the spelling matcher alone. */
const top = (q: string, n = 3) => rankMatches(roots, spellingMatcher(roots, q), n).map((m) => roots[m.id]!.ar);
/** The best spelling match for a query. */
const best = (q: string) => rankMatches(roots, spellingMatcher(roots, q), 1)[0];

describe('spellingMatcher on the fixture', () => {
  it('ignores Arabic queries, empty queries and single letters', () => {
    expect(spellingMatcher(fixtureGalaxy.roots, 'رحم')).toEqual([]);
    expect(spellingMatcher(fixtureGalaxy.roots, '  ')).toEqual([]);
    expect(spellingMatcher(fixtureGalaxy.roots, 'r')).toEqual([]);
  });

  it('finds a lemma by its Latin spelling and gives the lemma as the reason', () => {
    const [m] = spellingMatcher(fixtureGalaxy.roots, 'rahman');
    expect(m).toMatchObject({ id: 2, reason: { kind: 'latin', text: 'رَحْمٰن' } });
    expect(m!.score).toBeGreaterThan(TIER.prefix);
    expect(m!.score).toBeLessThanOrEqual(TIER.exact);
  });

  it('scores a prefix below an exact match', () => {
    const [m] = spellingMatcher(fixtureGalaxy.roots, 'rahee');
    expect(m!.id).toBe(2);
    expect(m!.score).toBeGreaterThan(TIER.contains);
    expect(m!.score).toBeLessThanOrEqual(TIER.prefix);
  });

  it('keeps root-letter search working through the full search', () => {
    expect(searchRoots(fixtureGalaxy.roots, 'rhm')[0]!.id).toBe(2);
    expect(searchRoots(fixtureGalaxy.roots, 'r').map((m) => m.id)).toEqual([4, 2]);
  });
});

describe('spellingMatcher on the real galaxy', () => {
  // [query, root, expected lemma or null]: the root must be the top result.
  const cases: [string, string, string | null][] = [
    ['noor', 'نور', 'نُور'],
    ['nur', 'نور', 'نُور'],
    ['sabr', 'صبر', null],
    ['rahman', 'رحم', 'رَحْمٰن'],
    ['rahmaan', 'رحم', 'رَحْمٰن'],
    ['ar-rahman', 'رحم', 'رَحْمٰن'],
    ['rahim', 'رحم', 'رَحِيم'],
    ['raheem', 'رحم', 'رَحِيم'],
    ['kitab', 'كتب', 'كِتاب'],
    ['kitaab', 'كتب', 'كِتاب'],
    ['qalb', 'قلب', null],
    ['salah', 'صلو', 'صَلاة'],
    ['salat', 'صلو', 'صَلاة'],
    ['zakat', 'زكو', 'زَكاة'],
    ['zakah', 'زكو', 'زَكاة'],
    ['jannah', 'جنن', 'جَنَّة'],
    ['jannat', 'جنن', 'جَنَّة'],
    ['iman', 'أمن', 'إِيمان'],
    ['eemaan', 'أمن', 'إِيمان'],
    ['taqwa', 'وقي', 'تَقْوَى'],
    ['3ilm', 'علم', null],
    ['ilm', 'علم', null],
    ['7amd', 'حمد', null],
    ['hamd', 'حمد', null],
    ['quran', 'قرأ', 'قُرْءان'],
    ["qur'an", 'قرأ', 'قُرْءان'],
    ['allah', 'أله', 'اللَّه'],
    ['islam', 'سلم', 'إِسْلام'],
    ['salam', 'سلم', 'سَلام'],
    ['dhikr', 'ذكر', 'ذِكْر'],
    ['zikr', 'ذكر', 'ذِكْر'],
    ['shukr', 'شكر', 'شُكْر'],
    ['shirk', 'شرك', 'شِرْك'],
    ['kufr', 'كفر', 'كُفْر'],
    ['din', 'دين', 'دِين'],
    ['deen', 'دين', 'دِين'],
    ['rasul', 'رسل', 'رَسُول'],
    ['rasool', 'رسل', 'رَسُول'],
    ['nabi', 'نبأ', 'نَبِيّ'],
    ['tawbah', 'توب', 'تَوْبَة'],
    ['maghfirah', 'غفر', 'مَغْفِرَة'],
    ['hidayah', 'هدي', null],
    ['huda', 'هدي', 'هُدًى'],
    ['masjid', 'سجد', 'مَسْجِد'],
    ['sujud', 'سجد', 'سُجُود'],
    // Short "a" fits both حَجّ and حاجّ; only the root is checked.
    ['hajj', 'حجج', null],
    ['siyam', 'صوم', 'صِيام'],
    ['sawm', 'صوم', 'صَوْم'],
    ['halal', 'حلل', 'حَلال'],
    ['haram', 'حرم', 'حَرام'],
    ['hikmah', 'حكم', 'حِكْمَة'],
    ['ni3mah', 'نعم', 'نِعْمَة'],
    ['ruh', 'روح', 'رُوح'],
    ['nafs', 'نفس', 'نَفْس'],
    ['yawm', 'يوم', 'يَوْم'],
    ['qiyamah', 'قوم', 'قِيامَة'],
    ['khalq', 'خلق', 'خَلْق'],
    ['3arsh', 'عرش', 'عَرْش'],
    ['tasbih', 'سبح', 'تَسْبِيح'],
    ['rabb', 'ربب', 'رَبّ'],
    ['ilah', 'أله', 'إِلٰه'],
    ['mu2min', 'أمن', 'مُؤْمِن'],
    ['mumin', 'أمن', 'مُؤْمِن'],
  ];

  it.each(cases)('"%s" finds %s first', (q, root, lemma) => {
    expect(top(q, 1)).toEqual([root]);
    // NFC: the order of stacked marks (shadda + fatha) differs between sources.
    if (lemma) expect(best(q)!.reason.text.normalize('NFC')).toBe(lemma.normalize('NFC'));
  });

  it('is part of the full search', () => {
    expect(searchRoots(roots, 'noor')[0]!.reason).toEqual({ kind: 'latin', text: 'نُور' });
    expect(roots[searchRoots(roots, 'rhm')[0]!.id]!.ar).toBe('رحم');
  });

  it('uses the latin reason kind', () => {
    expect(best('noor')!.reason.kind).toBe('latin');
  });

  it('runs well under 20 ms per query on average', () => {
    const queries = cases.map(([q]) => q);
    spellingMatcher(roots, 'warm up the index');
    const start = performance.now();
    for (const q of queries) spellingMatcher(roots, q);
    const avg = (performance.now() - start) / queries.length;
    expect(avg).toBeLessThan(20);
  });
});
