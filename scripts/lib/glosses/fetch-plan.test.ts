import { describe, expect, it } from 'vitest';
import { appendixTitle, lemmaTitles } from './fetch-plan';

describe('appendixTitle', () => {
  it('builds the root appendix title', () => {
    expect(appendixTitle('نور')).toBe('Appendix:Arabic roots/ن و ر');
    expect(appendixTitle('أمن')).toBe('Appendix:Arabic roots/ء م ن');
  });
});

describe('lemmaTitles', () => {
  it('guesses page titles for each lemma, with long-a, taa marbuta and alef maqsura variants', () => {
    const roots = [
      { ar: 'رحم', lemmas: [{ ar: 'رَحْمٰن' }, { ar: 'رَحِيم' }] },
      { ar: 'كون', lemmas: [{ ar: 'مَكانَت' }, { ar: 'كانَ' }, { ar: 'أُحْكِمَتْ' }] },
      { ar: 'هدي', lemmas: [{ ar: 'هُدًى' }] },
      { ar: 'شيأ', lemmas: [{ ar: 'شَىْء' }] },
    ];
    expect(lemmaTitles(roots)).toEqual(['رحمن', 'رحمان', 'رحيم', 'مكانت', 'مكانة', 'كان', 'أحكمت', 'هدى', 'هدي', 'شىء', 'شيء']);
  });
});
