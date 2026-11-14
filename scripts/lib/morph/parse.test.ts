import { describe, expect, it } from 'vitest';
import { parseCorpusWords, segmentTag } from './parse';

const SAMPLE = [
  '2:30:10:1\tقَالُ\tV\tPERF|VF:1|ROOT:قول|LEM:قالَ|3MP',
  '2:30:10:2\tوٓا۟\tN\tPRON|SUFF|3MP',
  '2:30:11:1\tأَ\tN\tINTG|PREF|LEM:أ',
  '2:30:11:2\tتَجْعَلُ\tV\tIMPF|VF:1|ROOT:جعل|LEM:جَعَلَ|2MS|MOOD:IND',
  '',
  '2:1:1:1\tالٓمٓ\tP\tINL|',
].join('\n');

describe('parseCorpusWords', () => {
  it('groups segments into words in file order', () => {
    const words = parseCorpusWords(SAMPLE);
    expect(words.map((w) => `${w.verse}:${w.word}`)).toEqual(['2:30:10', '2:30:11', '2:1:1']);
    expect(words[0]!.segments.map((s) => s.text)).toEqual(['قَالُ', 'وٓا۟']);
  });

  it('keeps the root and lemma of each segment apart from the tag', () => {
    const [qalu] = parseCorpusWords(SAMPLE);
    expect(qalu!.segments[0]).toEqual({ text: 'قَالُ', tag: 'V|PERF|VF:1|3MP', root: 'قول', lemma: 'قالَ' });
    expect(qalu!.segments[1]).toEqual({ text: 'وٓا۟', tag: 'N|PRON|SUFF|3MP', root: undefined, lemma: undefined });
  });

  it('drops empty features', () => {
    expect(parseCorpusWords(SAMPLE)[2]!.segments[0]!.tag).toBe('P|INL');
  });

  it('throws on a malformed line', () => {
    expect(() => parseCorpusWords('2:30\tx')).toThrow(/line 1/);
  });
});

describe('segmentTag', () => {
  it('leaves out the lemma, root and family features', () => {
    expect(segmentTag('P', ['ACC', 'LEM:إِنّ', 'FAM:إِنّ'])).toBe('P|ACC');
  });
});
