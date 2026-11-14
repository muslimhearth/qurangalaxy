// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Galaxy, Occurrences, Verses } from '../data/types';
import { lemmaOccurrences, type LemmaIndex } from '../data/lemmaIndex';
import { particleOccurrences, sameForm, wordStarts, wordTotal } from './counts';
import type { MorphTags, Particles, SurahMorph } from './types';
import { wordAt } from './word';

// Word card counts on the real data.
const read = <T>(f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8')) as T;
const galaxy = read<Galaxy>('galaxy.json');
const occurrences = read<Occurrences>('occurrences.json');
const lemmas = read<LemmaIndex>('lemmas.json');
const verses = read<Verses>('verses.json');
const tags = read<MorphTags>('morph/tags.json');
const particles = read<Particles>('particles.json');

/** The three "In the Quran" counts of one word: [words, verses] for form, lemma and root. */
function counts(surah: number, ayah: number, pos: number) {
  const word = wordAt(read<SurahMorph>(`morph/${surah}.json`), tags, ayah, pos)!;
  const text = verses[`${surah}:${ayah}`]!.ar.split(' ')[word.pos - 1]!;
  const pair = (l: { w: number[] }[]) => [wordTotal(l as never), l.length];
  if (word.root === null) {
    const list = particleOccurrences(particles.words[word.lemma!]!, wordStarts(verses));
    return { form: pair(sameForm(list, verses, text)), lemma: pair(list) };
  }
  const rootOcc = occurrences[word.root]!;
  const lemmaOcc = lemmaOccurrences(rootOcc, lemmas[word.root]!, word.lemma!);
  return { form: pair(sameForm(rootOcc, verses, text)), lemma: pair(lemmaOcc), root: pair(rootOcc), word };
}

describe('word card counts', () => {
  it('قَالُوٓا۟ in 2:30: same form 77 words in 74 verses', () => {
    const c = counts(2, 30, 10);
    expect(galaxy.roots[c.word!.root!]!.ar).toBe('قول');
    expect(c.form).toEqual([77, 74]);
    expect(c.lemma).toEqual([1618, 1321]);
    expect(c.root).toEqual([1722, 1383]);
  });

  it('ٱلرَّحْمَٰنِ in 1:3: same form 21 words in 21 verses', () => {
    const c = counts(1, 3, 1);
    expect(c.form).toEqual([21, 21]);
    expect(c.lemma).toEqual([57, 56]);
    expect(c.root).toEqual([339, 313]);
  });

  it('a particle (فِى in 2:30) counts by its lemma, and its own verse is in the list', () => {
    const c = counts(2, 30, 7);
    expect(c.root).toBeUndefined();
    expect(c.lemma[0]).toBeGreaterThan(1000);
    expect(c.form[0]).toBeGreaterThan(0);
    const list = particleOccurrences(particles.words[particles.lemmas.indexOf('فِي')]!, wordStarts(verses));
    expect(list.find((o) => o.v === '2:30')!.w).toEqual([7, 12, 15]);
  });
});
