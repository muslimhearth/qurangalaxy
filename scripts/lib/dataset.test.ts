import { describe, expect, it } from 'vitest';
import { buildDataset } from './dataset';

const MORPH = [
  '1:1:1:1\tبِ\tP\tP|PREF|LEM:ب',
  '1:1:1:2\tسْمِ\tN\tROOT:سمو|LEM:اسْم|M|GEN',
  '1:1:2:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN',
  '1:2:1:1\tٱللَّهِ\tN\tPN|ROOT:أله|LEM:اللَّه|GEN',
  '2:1:1:1\tالٓمٓ\tP\tINL|LEM:الٓمٓ',
].join('\n');

const AR = [
  '1|1|بِسْمِ ٱللَّهِ',
  '1|2|ٱللَّهِ',
  // Basmala in Tanzil's exact code points, then the verse.
  '2|1|بِسْمِ ٱللَّهِ ' +
    'ٱلرَّحْمَٰنِ ' +
    'ٱلرَّحِيمِ الٓمٓ',
  '# license',
].join('\n');

const EN = ['1|1|In the name of Allah', '1|2|Allah', '2|1|Alif, Lam, Meem.', '# source'].join('\n');

describe('buildDataset', () => {
  const data = buildDataset(MORPH, AR, EN);

  it('builds roots with transliteration, layout and clusters', () => {
    expect(data.galaxy.version).toBe(1);
    expect(data.galaxy.roots.map((r) => [r.id, r.ar, r.tr, r.count])).toEqual([
      [0, 'أله', 'ʾ-l-h', 2],
      [1, 'سمو', 's-m-w', 1],
    ]);
    expect(data.galaxy.roots[0]!.pos).toHaveLength(3);
    expect(data.galaxy.clusterCount).toBeGreaterThan(0);
  });

  it('does not link roots that share only one verse', () => {
    expect(data.galaxy.edges).toEqual([]);
  });

  it('builds verses with the basmala removed and English attached', () => {
    expect(data.verses['2:1']).toEqual({ ar: 'الٓمٓ', en: 'Alif, Lam, Meem.' });
    expect(Object.keys(data.verses)).toEqual(['1:1', '1:2', '2:1']);
  });

  it('returns occurrences, no mismatches and no validation errors', () => {
    expect(data.occurrences[0]).toEqual([
      { v: '1:1', w: [2] },
      { v: '1:2', w: [1] },
    ]);
    expect(data.mismatches).toEqual([]);
    expect(data.errors).toEqual([]);
  });

  it('fills English meanings from the Wiktionary cache it is given', () => {
    const wiki = {
      appendix: { أله: '==Arabic==\n===Root===\n# Related to [[god]].', سمو: null },
      pages: { الله: '==Arabic==\n{{ar-rootbox|ء ل ه}}\n===Proper noun===\n{{ar-proper noun|اللّٰه}}\n# [[God]]' },
    };
    const withGlosses = buildDataset(MORPH, AR, EN, wiki);
    expect(withGlosses.galaxy.roots[0]!.en).toEqual(['god']);
    expect(withGlosses.galaxy.roots[0]!.lemmas[0]!.en).toEqual(['God']);
    expect(withGlosses.glossStats.roots.appendix).toBe(1);
    // Without a cache, meanings stay empty or come from the translation only.
    expect(data.galaxy.roots[0]!.lemmas[0]!.en).toEqual([]);
  });

  it('throws when Arabic and English verse keys differ', () => {
    expect(() => buildDataset(MORPH, AR, '1|1|x')).toThrow(/English/);
  });
});
