import { describe, expect, it } from 'vitest';
import {
  arabicSection,
  logicalLines,
  parseGlossLine,
  parseTemplate,
  plainText,
  splitPhrases,
  topTemplates,
} from './wikitext';

describe('topTemplates and logicalLines', () => {
  it('finds top-level templates only', () => {
    expect(topTemplates('* {{l|ar|x|t={{q|a}} b}} and {{m|ar|y}}')).toEqual(['l|ar|x|t={{q|a}} b', 'm|ar|y']);
  });

  it('joins a template spread over several lines', () => {
    expect(logicalLines('# a {{RQ|1\n|t=x}}\n# b')).toEqual(['# a {{RQ|1\n|t=x}}', '# b']);
  });
});

describe('parseTemplate', () => {
  it('splits positional and named arguments, respecting nested links and templates', () => {
    expect(parseTemplate('l|ar|رحمن|رَحْمَان|t=[[merciful]], {{q|x|y}}')).toEqual({
      name: 'l',
      positional: ['ar', 'رحمن', 'رَحْمَان'],
      named: { t: '[[merciful]], {{q|x|y}}' },
    });
  });
});

describe('plainText', () => {
  it('turns links, glossing templates and markup into text and drops other templates', () => {
    expect(plainText("[[day]], period from [[sunrise]] to [[sunset|dusk]]")).toBe('day, period from sunrise to dusk');
    expect(plainText('{{non-gloss|relating to [[mercy]]}}')).toBe('relating to mercy');
    expect(plainText("{{lb|ar|transitive}} to [[know]] {{+obj|ar|:بِ}}")).toBe('to know');
    expect(plainText("'''bold''' {{w|Judgment Day}} {{gl|note}}")).toBe('bold Judgment Day');
    expect(plainText('(day of) [[battle]]<ref>x</ref>')).toBe('battle');
  });
});

describe('splitPhrases', () => {
  it('splits on commas and semicolons, drops articles and long phrases', () => {
    expect(splitPhrases('day, period from sunrise to sunset; a mountain')).toEqual(['day', 'mountain']);
  });

  it('lowercases a sentence start but keeps proper names', () => {
    expect(splitPhrases('To nap.')).toEqual(['to nap']);
    expect(splitPhrases('Judgment Day')).toEqual(['Judgment Day']);
    expect(splitPhrases('God', true)).toEqual(['God']);
    expect(splitPhrases('Light', false)).toEqual(['light']);
  });

  it('drops phrases with Arabic letters or leftover markup', () => {
    expect(splitPhrases('light, نور, }}')).toEqual(['light']);
  });
});

describe('parseGlossLine', () => {
  it('returns the short phrases of a sense', () => {
    expect(parseGlossLine('# {{lb|ar|transitive}} to [[know]], to have [[knowledge]], to be [[aware]]')).toEqual({
      phrases: ['to know', 'to have knowledge', 'to be aware'],
    });
  });

  it('skips dialect, colloquial and modern senses', () => {
    expect(parseGlossLine('# {{lb|ar|Egyptian Arabic}} [[car]]').skip).toBe(true);
    expect(parseGlossLine('# {{lb|ar|Modern Standard Arabic}} [[train]]').skip).toBe(true);
    expect(parseGlossLine('# {{lb|ar|uncommon|Classical}} [[battle]]').skip).toBeFalsy();
  });

  it('recognizes form-of senses and their target', () => {
    expect(parseGlossLine('# {{ar-verbal noun of|عَلِمَ|form=I}}')).toEqual({
      phrases: [],
      formOf: { kind: 'verbal noun', target: 'عَلِمَ' },
    });
    expect(parseGlossLine('# {{alt form|ar|عَالَم|from=Classical Arabic}}').formOf).toEqual({
      kind: 'alt form',
      target: 'عَالَم',
    });
    expect(parseGlossLine('# {{plural of|ar|عَيْن}}').formOf).toEqual({ kind: 'plural', target: 'عَيْن' });
  });
});

describe('arabicSection', () => {
  it('returns the ==Arabic== level-2 section only', () => {
    const text = '==English==\nfoo\n==Arabic==\n===Noun===\n# day\n==Persian==\n# روز';
    expect(arabicSection(text)).toBe('==Arabic==\n===Noun===\n# day\n');
    expect(arabicSection('==English==\nx')).toBe('');
  });
});
