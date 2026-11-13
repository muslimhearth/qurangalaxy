import { describe, expect, it } from 'vitest';
import type { MorphWord } from './morph-index';
import { normalizeGloss } from './normalize';

const plain: MorphWord = { lemma: 'x', root: 'y', properNoun: false, verb: false, prepPrefix: false, pronSuffix: false };
const n = (gloss: string, word: Partial<MorphWord> = {}) => normalizeGloss(gloss, { ...plain, ...word });

describe('normalizeGloss', () => {
  it('trims punctuation, quotes and dashes', () => {
    expect(n('the earth.')).toBe('earth');
    expect(n('"I seek refuge')).toBe('i seek refuge');
    expect(n('Allah -', { properNoun: true })).toBe('Allah');
  });

  it('drops standalone helper words in brackets', () => {
    expect(n('(there is) no')).toBe('no');
    expect(n('(is) the Most High,')).toBe('most high');
    expect(n('[and] not')).toBe('not');
    expect(n('(the) guarding of both of them.')).toBe('guarding of both of them');
  });

  it('keeps the bracket text when nothing else is left', () => {
    expect(n('(is)')).toBe('is');
  });

  it('joins a bracket part glued to a word', () => {
    expect(n('what(ever)')).toBe('whatever');
  });

  it('drops leading conjunctions, articles and possessives', () => {
    expect(n('and the earth.')).toBe('earth');
    expect(n('His Knowledge')).toBe('knowledge');
    expect(n('so their hearts')).toBe('hearts');
  });

  it('drops a leading preposition only when the word has a preposition prefix', () => {
    expect(n('by His permission.', { prepPrefix: true })).toBe('permission');
    expect(n('in', { prepPrefix: false })).toBe('in');
    expect(n('from the light')).toBe('from the light');
  });

  it('drops a trailing object pronoun only when the word has a pronoun suffix', () => {
    expect(n('overtakes Him', { pronSuffix: true })).toBe('overtakes');
    expect(n('fear Him')).toBe('fear him');
  });

  it('drops a leading subject pronoun of a verb', () => {
    expect(n('they believe', { verb: true })).toBe('believe');
    expect(n('He said', { verb: true })).toBe('said');
    expect(n('we gave', { verb: true })).toBe('gave');
    expect(n('they', { verb: true })).toBe('they');
    expect(n('they believers')).toBe('they believers');
  });

  it('never strips a gloss to nothing', () => {
    expect(n('the')).toBe('the');
    expect(n('His', { pronSuffix: true })).toBe('his');
  });

  it('lowercases except proper nouns and Allah', () => {
    expect(n('The Lord of Allah')).toBe('lord of Allah');
    expect(n('Ibrahim', { properNoun: true })).toBe('Ibrahim');
  });

  it('returns an empty string for an empty gloss', () => {
    expect(n('  ')).toBe('');
  });
});
