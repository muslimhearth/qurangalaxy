import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCorpusGlosses, toGlossMaps, type CorpusGlossFile } from './load';

const file: CorpusGlossFile = {
  meta: { source: 'test', licence: 'local', generated: '2026-01-01', topN: 3 },
  words: { total: 3, withLemma: 3, withRoot: 3 },
  lemmas: {
    'نُور': { root: 'نور', count: 2, glosses: [{ gloss: 'light', count: 2 }, { gloss: 'radiance', count: 1 }] },
  },
  roots: { 'نور': { count: 3, lemmas: 1, glosses: [{ gloss: 'light', count: 2 }, { gloss: 'radiance', count: 1 }] } },
};

describe('toGlossMaps', () => {
  it('maps lemmas and roots to their glosses, most frequent first', () => {
    const maps = toGlossMaps(file);
    expect(maps.lemmas.get('نُور')).toEqual(['light', 'radiance']);
    expect(maps.roots.get('نور')).toEqual(['light', 'radiance']);
  });

  it('keeps at most `limit` glosses', () => {
    expect(toGlossMaps(file, 1).roots.get('نور')).toEqual(['light']);
  });
});

describe('loadCorpusGlosses', () => {
  it('reads the JSON file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'glosses-')), 'g.json');
    writeFileSync(path, JSON.stringify(file));
    expect(loadCorpusGlosses(path)?.lemmas.get('نُور')).toEqual(['light', 'radiance']);
  });

  it('returns undefined when the file is missing', () => {
    expect(loadCorpusGlosses('/nonexistent/corpus-glosses.json')).toBeUndefined();
  });
});
