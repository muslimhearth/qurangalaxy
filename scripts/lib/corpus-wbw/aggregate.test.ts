import { describe, expect, it } from 'vitest';
import { aggregateGlosses, collectVerses, validateWordCounts } from './aggregate';
import { indexMorphology } from './morph-index';
import type { WbwWord } from './parse';

const w = (location: string, gloss = 'x'): WbwWord => ({ location, translit: '', gloss });

describe('collectVerses', () => {
  it('keeps the longest word list per verse across pages', () => {
    const verses = collectVerses([
      [w('1:1:1'), w('1:2:1')],
      [w('1:2:1'), w('1:2:2')],
    ]);
    expect(verses.get('1:1')).toHaveLength(1);
    expect(verses.get('1:2')?.map((x) => x.location)).toEqual(['1:2:1', '1:2:2']);
  });
});

describe('validateWordCounts', () => {
  it('reports missing verses and word-count mismatches', () => {
    const counts = new Map([
      ['1:1', 1],
      ['1:2', 3],
      ['1:3', 1],
    ]);
    const verses = new Map([
      ['1:1', [w('1:1:1')]],
      ['1:2', [w('1:2:1'), w('1:2:2')]],
    ]);
    expect(validateWordCounts(verses, counts)).toEqual({
      complete: 1,
      missing: ['1:3'],
      mismatches: [{ verse: '1:2', expected: 3, actual: 2 }],
    });
  });
});

const MORPH = [
  '1:1:1:1\tx\tN\tROOT:نور|LEM:نُور|M|NOM',
  '1:1:2:1\tx\tP\tCONJ|PREF|LEM:و',
  '1:1:2:2\tx\tN\tROOT:نور|LEM:نُور|M|NOM',
  '1:1:3:1\tx\tN\tROOT:نور|LEM:نُور|M|NOM',
  '1:1:4:1\tx\tV\tROOT:نور|LEM:أَنارَ|PERF',
  '1:1:5:1\tx\tN\tPRON|3MS',
].join('\n');

describe('aggregateGlosses', () => {
  const index = indexMorphology(MORPH);
  const words = [
    w('1:1:1', 'the light'),
    w('1:1:2', 'and the light.'),
    w('1:1:3', '(a) radiance'),
    w('1:1:4', 'lit up'),
    w('1:1:5', 'he'),
  ];
  const result = aggregateGlosses(words, index, 5);

  it('counts normalized glosses per lemma, most frequent first', () => {
    expect(result.lemmas['نُور']).toEqual({
      root: 'نور',
      count: 3,
      glosses: [
        { gloss: 'light', count: 2 },
        { gloss: 'radiance', count: 1 },
      ],
    });
  });

  it('sums glosses per root across its lemmas', () => {
    expect(result.roots['نور']).toEqual({
      count: 4,
      lemmas: 2,
      glosses: [
        { gloss: 'light', count: 2 },
        { gloss: 'lit up', count: 1 },
        { gloss: 'radiance', count: 1 },
      ],
    });
  });

  it('skips words without a lemma', () => {
    expect(Object.keys(result.lemmas)).toEqual(['نُور', 'أَنارَ']);
    expect(result.words).toEqual({ total: 5, withLemma: 4, withRoot: 4 });
  });

  it('keeps only the top N glosses', () => {
    expect(aggregateGlosses(words, index, 1).lemmas['نُور']?.glosses).toEqual([{ gloss: 'light', count: 2 }]);
  });

  it('ignores words unknown to the morphology', () => {
    expect(aggregateGlosses([w('9:9:9', 'z')], index, 5).words).toEqual({ total: 1, withLemma: 0, withRoot: 0 });
  });
});
