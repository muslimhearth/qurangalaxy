import { describe, expect, it } from 'vitest';
import { buildGlosses, formOfTargets, glossStats } from './glosses';
import type { WikiCache } from './cache';

const page = (root: string, head: string, senses: string) =>
  `==Arabic==\n{{ar-rootbox|${root}}}\n===Noun===\n{{ar-noun|${head}|m}}\n${senses}\n`;

const wiki: WikiCache = {
  appendix: {
    نور: '==Arabic==\n===Root===\n# Related to [[light]].\n====Derived terms====\n* {{l|ar|نَار|t=fire}}',
    يوم: null,
    بحر: null,
    زبر: '==Arabic==\n===Root===\n# Related to [[stupidity]], [[iron]].',
  },
  pages: {
    نور: page('ن و ر', 'نُور', '# [[light]], [[radiance]]'),
    يوم: page('ي و م', 'يَوْم', '# [[day]]\n# {{lb|ar|Egyptian Arabic}} [[today]]'),
    عيون: page('ع ي ن', 'عُيُون', '# {{plural of|ar|عَيْن}}'),
    زبرة: page('ز ب ر', 'زُبْرَة', '# [[piece]] of [[iron]]\n# [[iron]]'),
  },
};

const corpus = [
  'the sea and the ships',
  'ships sail in the sea',
  'they crossed the sea',
  'the night and the day',
  'he created the earth',
  'the rain falls on the earth',
  'trees and fruits grow',
  'the light of the lamp',
  'the camels drink water',
  'birds fly in rows',
  'a garden with rivers',
  'mountains like wool',
];

const input = {
  roots: [
    { ar: 'نور', lemmas: [{ ar: 'نار', count: 145 }, { ar: 'نُور', count: 49 }, { ar: 'مُنِير', count: 6 }] },
    { ar: 'يوم', lemmas: [{ ar: 'يَوْم', count: 400 }] },
    { ar: 'بحر', lemmas: [{ ar: 'بَحْر', count: 40 }] },
    { ar: 'زبر', lemmas: [{ ar: 'زُبَر', count: 2 }, { ar: 'زُبْرَة', count: 1 }] },
  ],
  wiki,
  rootTexts: [[corpus[7]!], [corpus[3]!], [corpus[0]!, corpus[1]!, corpus[2]!], [corpus[4]!]],
  lemmaTexts: [[[], [corpus[7]!], []], [[corpus[3]!]], [[corpus[0]!, corpus[1]!, corpus[2]!]], [[], []]],
  allTexts: corpus,
};

describe('buildGlosses', () => {
  const out = buildGlosses(input);

  it('uses the appendix root meaning first', () => {
    expect(out.roots[0]).toEqual(['light']);
    expect(out.rootSource[0]).toBe('appendix');
  });

  it('glosses lemmas from their pages, else from the appendix derived terms', () => {
    expect(out.lemmas[0]).toEqual([['fire'], ['light', 'radiance'], []]);
    expect(out.lemmaSource[0]).toEqual(['wiktionary', 'wiktionary', 'none']);
  });

  it('falls back to the top lemma glosses when the root has no appendix page', () => {
    expect(out.roots[1]).toEqual(['day']);
    expect(out.rootSource[1]).toBe('lemmas');
  });

  it('falls back to distinctive translation words when Wiktionary has nothing', () => {
    expect(out.roots[2]).toEqual(['sea', 'ships']);
    expect(out.rootSource[2]).toBe('fallback');
    expect(out.lemmas[2]).toEqual([['sea', 'ships']]);
    expect(out.lemmaSource[2]).toEqual(['fallback']);
  });

  it('puts root meanings that its lemmas share first', () => {
    expect(out.roots[3]).toEqual(['iron', 'stupidity']);
  });

  it('counts sources and covered words', () => {
    const s = glossStats(input.roots, out);
    expect(s.roots).toEqual({ appendix: 2, lemmas: 1, fallback: 1, none: 0 });
    expect(s.lemmas.wiktionary).toBe(4);
    expect(s.words.wiktionary).toBe(145 + 49 + 400 + 1);
  });
});

describe('formOfTargets', () => {
  it('lists form-of targets that are not cached yet', () => {
    const roots = [{ ar: 'عين', lemmas: [{ ar: 'عُيُون', count: 1 }] }];
    expect(formOfTargets(roots, wiki)).toEqual(['عين']);
  });
});
