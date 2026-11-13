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

  it('links roots that share a verse', () => {
    expect(data.galaxy.edges).toEqual([{ source: 0, target: 1, weight: 1 }]);
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

  it('throws when Arabic and English verse keys differ', () => {
    expect(() => buildDataset(MORPH, AR, '1|1|x')).toThrow(/English/);
  });
});
