import { describe, expect, it } from 'vitest';
import { describeParts, grammarLines, segmentKind } from './grammar';

const seg = (text: string, tag: string) => ({ text, tag });
// 2:30 word 10 قَالُوٓا۟ and 1:3 word 1 ٱلرَّحْمَٰنِ, as in the Corpus.
const QALU = [seg('قَالُ', 'V|PERF|VF:1|3MP'), seg('وٓا۟', 'N|PRON|SUFF|3MP')];
const RAHMAN = [seg('ٱل', 'P|DET|PREF'), seg('رَّحْمَٰنِ', 'N|MS|GEN|ADJ')];

describe('segmentKind', () => {
  it('finds the part of speech of nouns, verbs and particles', () => {
    expect(segmentKind('V|PERF|VF:1|3MP')).toBe('V');
    expect(segmentKind('N|MS|GEN|ADJ')).toBe('ADJ');
    expect(segmentKind('N|ACT_PCPL|VF:1|M|INDEF|NOM')).toBe('ACT_PCPL');
    expect(segmentKind('N|M|GEN')).toBe('N');
    expect(segmentKind('P|ACC')).toBe('ACC');
  });
});

describe('describeParts', () => {
  it('labels a verb stem and its subject suffix', () => {
    const [stem, suffix] = describeParts(QALU);
    expect(stem).toMatchObject({ role: 'stem', label: 'verb', title: 'Verb' });
    expect(suffix).toMatchObject({ role: 'suffix', label: 'they' });
    expect(suffix!.title).toMatch(/subject pronoun.*3rd person masculine plural/i);
  });

  it('labels the article prefix "the"', () => {
    const [prefix, stem] = describeParts(RAHMAN);
    expect(prefix).toMatchObject({ role: 'prefix', label: 'the', title: 'Determiner' });
    expect(stem).toMatchObject({ role: 'stem', label: 'adjective' });
  });

  it('gives common prefixes short plain words', () => {
    const label = (text: string, tag: string) => describeParts([seg(text, tag), seg('x', 'N|M|GEN')])[0]!.label;
    expect(label('وَ', 'P|CONJ|PREF')).toBe('and');
    expect(label('فَ', 'P|REM|PREF')).toBe('so');
    expect(label('بِ', 'P|P|PREF')).toBe('with');
    expect(label('لِ', 'P|P|PREF')).toBe('for');
    expect(label('سَ', 'P|FUT|PREF')).toBe('will');
    expect(label('يَٰ', 'P|VOC|PREF')).toBe('O');
  });

  it('tells subject and object suffixes apart on a verb', () => {
    // أَنذَرْتَهُمْ: you warned them.
    const parts = describeParts([
      seg('ءَ', 'P|EQ|PREF'),
      seg('أَنذَرْ', 'V|PERF|VF:4|2MS'),
      seg('تَ', 'N|PRON|SUFF|2MS'),
      seg('هُمْ', 'N|PRON|SUFF|3MP'),
    ]);
    expect(parts.map((p) => p.label)).toEqual(['question', 'verb', 'you', 'them']);
  });

  it('reads a suffix on a 3rd person singular verb as an object', () => {
    // يَعْلَمُهُ: he knows it.
    const parts = describeParts([seg('يَعْلَمُ', 'V|IMPF|VF:1|3MS|MOOD:IND'), seg('هُ', 'N|PRON|SUFF|3MS')]);
    expect(parts[1]!.label).toBe('him');
  });

  it('reads a suffix on a noun as a possessive', () => {
    const parts = describeParts([seg('رَبُّ', 'N|M|NOM'), seg('كَ', 'N|PRON|SUFF|2MS')]);
    expect(parts[1]!.label).toBe('your');
  });
});

describe('grammarLines', () => {
  it('describes a verb in plain English on two lines', () => {
    expect(grammarLines(QALU)).toEqual([
      ['Verb', 'Form I', 'perfect (past)', 'active'],
      ['3rd person', 'masculine', 'plural'],
    ]);
  });

  it('describes an adjective with case and definiteness', () => {
    expect(grammarLines(RAHMAN)).toEqual([
      ['Adjective', 'genitive case', 'definite'],
      ['masculine', 'singular'],
    ]);
  });

  it('adds mood and passive voice', () => {
    expect(grammarLines([seg('يُؤْمِنُ', 'V|IMPF|VF:4|PASS|3MS|MOOD:JUS')])[0]).toEqual([
      'Verb',
      'Form IV',
      'imperfect (present)',
      'passive',
      'jussive',
    ]);
  });

  it('describes a participle with its form and an indefinite noun', () => {
    expect(grammarLines([seg('جَاعِلٌ', 'N|ACT_PCPL|VF:1|M|INDEF|NOM')])).toEqual([
      ['Active participle', 'Form I', 'nominative case', 'indefinite'],
      ['masculine'],
    ]);
  });

  it('describes a particle by its name only', () => {
    expect(grammarLines([seg('فِى', 'P|P')])).toEqual([['Preposition'], []]);
  });
});
