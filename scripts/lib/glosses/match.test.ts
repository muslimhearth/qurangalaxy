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

  it('prefers a noun for a noun lemma and a main entry over a derived one', () => {
    const qawm = [
      entry({ title: 'قوم', root: 'قوم', head: 'قوم', pos: 'Verb', glosses: ['to raise'] }),
      entry({ title: 'قوم', head: 'قَوْم', glosses: ['standing up'], formOf: [{ kind: 'verbal noun', target: 'قَامَ' }] }),
      entry({ title: 'قوم', head: 'قَوْم', glosses: ['people', 'nation'] }),
    ];
    expect(matchEntry('قَوْم', 'قوم', () => qawm)?.glosses).toEqual(['people', 'nation']);
    const rabb = [
      entry({ title: 'رب', root: 'ربب', head: 'رَبَّ', pos: 'Verb', glosses: ['to be master'] }),
      entry({ title: 'رب', root: 'ربب', head: 'رَبّ', glosses: ['master', 'lord'] }),
    ];
    expect(matchEntry('رَبّ', 'ربب', () => rabb)?.glosses).toEqual(['master', 'lord']);
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

  it('picks the homograph whose glosses the lemma verses use', () => {
    const kufr = [
      entry({ title: 'كفر', root: 'كفر', head: 'كَفَرَ', pos: 'Verb', glosses: ['to disbelieve'] }),
      entry({ title: 'كفر', head: 'كُفْر', formOf: [{ kind: 'verbal noun', target: 'كَفَرَ' }] }),
      entry({ title: 'كفر', head: 'كُفْر', glosses: ['pitch', 'tar'] }),
    ];
    const verses = [new Set(['disbeliev', 'sign']), new Set(['fire'])];
    expect(lemmaGlosses('كُفْر', 'كفر', () => kufr, verses)).toEqual(['disbelieve']);
    expect(lemmaGlosses('كُفْر', 'كفر', () => kufr)).toEqual(['pitch', 'tar']);
  });

  it('weighs an entry own glosses against its form-of target', () => {
    const pages2: Record<string, WikiEntry[]> = {
      رماح: [entry({ title: 'رماح', head: 'رِمَاح', glosses: ['habit of kicking'], formOf: [{ kind: 'plural', target: 'رُمْح' }] })],
      رمح: [entry({ title: 'رمح', head: 'رُمْح', glosses: ['spear', 'lance'] })],
    };
    const look = (t: string) => pages2[t] ?? [];
    expect(lemmaGlosses('رِماح', 'رمح', look)).toEqual(['habit of kicking']);
    expect(lemmaGlosses('رِماح', 'رمح', look, [new Set(['hand', 'spear'])])).toEqual(['spear', 'lance']);
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
