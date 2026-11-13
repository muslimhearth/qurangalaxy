import { describe, expect, it } from 'vitest';
import { lemmaGlosses, matchDerived, matchEntry } from './match';
import type { WikiEntry } from './pages';

const entry = (e: Partial<WikiEntry>): WikiEntry => ({
  title: 'x',
  root: null,
  head: 'x',
  pos: 'Noun',
  glosses: [],
  formOf: [],
  ...e,
});

const ILM: WikiEntry[] = [
  entry({ title: 'علم', root: 'علم', head: 'عَلِمَ', pos: 'Verb', glosses: ['to know'] }),
  entry({ title: 'علم', root: 'علم', head: 'عَلَّمَ', pos: 'Verb', glosses: ['to teach'] }),
  entry({ title: 'علم', root: 'علم', head: 'عِلْم', glosses: ['knowledge'] }),
  entry({ title: 'علم', root: 'علم', head: 'عَلَم', glosses: ['sign', 'flag'] }),
  entry({ title: 'علم', root: 'قيل', head: 'عِلْم', glosses: ['wrong root'] }),
];
const pages: Record<string, WikiEntry[]> = {
  علم: ILM,
  رحمان: [entry({ title: 'رحمان', root: 'رحم', head: 'رَحْمَان', glosses: ['merciful'] })],
  عيون: [entry({ title: 'عيون', root: 'عين', head: 'عُيُون', formOf: [{ kind: 'plural', target: 'عَيْن' }] })],
  عين: [entry({ title: 'عين', root: 'عين', head: 'عَيْن', glosses: ['eye', 'spring'] })],
  قائل: [entry({ title: 'قائل', root: 'قول', head: 'قَائِل', formOf: [{ kind: 'active participle', target: 'قَالَ' }] })],
};
const lookup = (t: string) => pages[t] ?? [];

describe('matchEntry', () => {
  it('uses the vowels to pick between homographs of the same root', () => {
    expect(matchEntry('عِلْم', 'علم', lookup)?.glosses).toEqual(['knowledge']);
    expect(matchEntry('عَلَّمَ', 'علم', lookup)?.glosses).toEqual(['to teach']);
    expect(matchEntry('عَلِمَ', 'علم', lookup)?.glosses).toEqual(['to know']);
  });

  it('finds a page under a spelling variant', () => {
    expect(matchEntry('رَحْمٰن', 'رحم', lookup)?.glosses).toEqual(['merciful']);
  });

  it('rejects entries of another root', () => {
    expect(matchEntry('عِلْم', 'قيل', lookup)?.glosses).toEqual(['wrong root']);
    expect(matchEntry('عِلْم', 'بون', lookup)).toBeUndefined();
  });
});

describe('lemmaGlosses', () => {
  it('follows a plural-of sense to the singular', () => {
    expect(lemmaGlosses('عُيُون', 'عين', lookup)).toEqual(['eye', 'spring']);
  });

  it('does not borrow a verb gloss for a participle', () => {
    expect(lemmaGlosses('قائِل', 'قول', lookup)).toEqual([]);
  });
});

describe('matchDerived', () => {
  it('finds the lemma among the appendix derived terms', () => {
    const derived = [
      { word: 'نُور', glosses: ['light'] },
      { word: 'نَار', glosses: ['fire'] },
    ];
    expect(matchDerived('نار', derived)).toEqual(['fire']);
    expect(matchDerived('مَنار', derived)).toEqual([]);
  });
});
