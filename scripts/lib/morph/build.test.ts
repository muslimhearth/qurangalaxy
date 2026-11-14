import { describe, expect, it } from 'vitest';
import type { Verses } from '../../../src/data/types';
import type { MorphRow } from '../../../src/morph/types';
import { buildMorph } from './build';

const MORPH = [
  '1:1:1:1\tبِ\tP\tP|PREF|LEM:ب',
  '1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN',
  '1:1:2:1\tفِى\tP\tP|LEM:فِي',
  '1:2:1:1\tبَعْدَمَا\tN\tROOT:بعد|LEM:بَعْد|ACC',
  '1:2:2:1\tقَالُ\tV\tPERF|VF:1|ROOT:قول|LEM:قالَ|3MP',
  '1:2:2:2\tوٓا۟\tN\tPRON|SUFF|3MP',
  '1:2:3:1\tفِي\tP\tP|LEM:فِي',
  '1:2:3:2\tهَا\tN\tPRON|SUFF|3FS',
].join('\n');

const VERSES = {
  '1:1': { ar: 'بِسْمِ فِى', en: '' },
  '1:2': { ar: 'بَعْدَ مَا قَالُوٓا۟ فِيهَا', en: '' },
} as Verses;

const ROOTS = [
  { ar: 'سمو', lemmas: [{ ar: 'اسْم' }] },
  { ar: 'قول', lemmas: [{ ar: 'قَوْل' }, { ar: 'قالَ' }] },
  { ar: 'بعد', lemmas: [{ ar: 'بَعْد' }] },
];

// A tiny joined-word table for the fixture: 1:2 corpus word 1 = Tanzil words 1-2.
const JOINED = { '1:2': 1 };

describe('buildMorph', () => {
  const out = buildMorph(MORPH, VERSES, ROOTS, JOINED);

  it('writes one row per Tanzil word with root, lemma and segments', () => {
    const tag = (t: string) => out.tags.indexOf(t);
    expect(out.errors).toEqual([]);
    expect(out.surahs[0]![0]![0]).toEqual([0, 0, 'بِ', tag('P|P|PREF'), 'سْمِ', tag('N|M|GEN')]);
    expect(out.surahs[0]![1]![2]).toEqual([1, 1, 'قَالُ', tag('V|PERF|VF:1|3MP'), 'وٓا۟', tag('N|PRON|SUFF|3MP')]);
  });

  it('marks the second word of a joined pair with the first word position', () => {
    expect((out.surahs[0]![1]![0] as MorphRow)[0]).toBe(2);
    expect(out.surahs[0]![1]![1]).toBe(1);
  });

  it('gives root-less words a particle lemma and lists their global word indices', () => {
    const fi = out.particles.lemmas.indexOf('فِي');
    const row = out.surahs[0]![0]![1] as MorphRow;
    expect(row[1]).toBe(fi);
    expect(row[0]).toBe(-1);
    // Global Tanzil words: 1:1 has 0-1, 1:2 has 2-5. فِي is at 1 and 5: deltas 1, 4.
    expect(out.particles.words[fi]).toEqual([1, 4]);
  });

  it('reports a word whose segments do not spell the Tanzil word', () => {
    const bad = buildMorph(MORPH, { ...VERSES, '1:1': { ar: 'بِسْمِ عَلَى', en: '' } } as Verses, ROOTS, JOINED);
    expect(bad.errors).toEqual([expect.stringMatching(/1:1 word 2/)]);
  });

  it('reports an unknown lemma', () => {
    const bad = buildMorph(MORPH, VERSES, [ROOTS[0]!, { ar: 'قول', lemmas: [] }, ROOTS[2]!], JOINED);
    expect(bad.errors).toEqual([expect.stringMatching(/قالَ/)]);
  });

  it('reports Tanzil words without a Corpus word', () => {
    const bad = buildMorph(MORPH, { ...VERSES, '1:1': { ar: 'بِسْمِ فِى زِدْ', en: '' } } as Verses, ROOTS, JOINED);
    expect(bad.errors).toEqual([expect.stringMatching(/1:1 word 3/)]);
  });
});
