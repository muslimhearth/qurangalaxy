import { describe, expect, it } from 'vitest';
import { buildTranslit } from './translit';

const TEXT = '1|1|Bismi All<u>a</U>hi\n1|2|Al<u>h</u>amdu\n\n# Name: Transliteration\n';

describe('buildTranslit', () => {
  it('keeps each verse text verbatim, markup included, keyed by verse', () => {
    expect(buildTranslit(TEXT, ['1:1', '1:2'])).toEqual({ '1:1': 'Bismi All<u>a</U>hi', '1:2': 'Al<u>h</u>amdu' });
  });

  it('fails when a verse is missing', () => {
    expect(() => buildTranslit(TEXT, ['1:1', '1:2', '1:3'])).toThrow(/1:3/);
  });

  it('fails when the file has an unknown verse', () => {
    expect(() => buildTranslit(TEXT, ['1:1'])).toThrow(/1:2/);
  });
});
