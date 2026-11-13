import { describe, expect, it } from 'vitest';
import { distinctiveWords, documentFrequencies, stem, tokenize } from './fallback';

describe('tokenize', () => {
  it('lowercases, drops punctuation, possessives and stop words', () => {
    expect(tokenize('And [it is] the Sea\'s waves, "patiently" - they said.')).toEqual(['sea', 'waves', 'patiently']);
  });
});

describe('stem', () => {
  it('merges simple plural forms', () => {
    expect(stem('ships')).toBe('ship');
    expect(stem('skies')).toBe('sky');
    expect(stem('glasses')).toBe('glass');
    expect(stem('grass')).toBe('grass');
    expect(stem('us')).toBe('us');
  });
});

describe('distinctiveWords', () => {
  const corpus = [
    'the sea and the ships upon the sea',
    'ships sail in the sea by his command',
    'be patient and give good tidings',
    'he created the heavens and the earth',
    'he created the earth and made rivers',
    'and the earth and its mountains',
    'he knows what is in the earth',
  ];
  const df = documentFrequencies(corpus);

  it('ranks words much more frequent in the given verses than overall', () => {
    expect(distinctiveWords([corpus[0]!, corpus[1]!], df, corpus.length)).toEqual(['sea', 'ships']);
  });

  it('shows the most common surface form of a merged stem', () => {
    const verses = ['the ship sails', 'ships here', 'the ship'];
    const all = [...verses, 'rain', 'wind', 'cloud', 'tree', 'stone', 'river', 'hill', 'bird', 'fish'];
    expect(distinctiveWords(verses, documentFrequencies(all), all.length)[0]).toBe('ship');
  });

  it('returns nothing when no word stands out', () => {
    expect(distinctiveWords([corpus[3]!, corpus[4]!, corpus[5]!, corpus[6]!], df, corpus.length)).not.toContain('earth');
  });
});
