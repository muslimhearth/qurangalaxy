// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Galaxy, VerseKey, Verses } from '../../../src/data/types';
import type { MorphRow, MorphTags, Particles, SurahMorph } from '../../../src/morph/types';
import { JOINED_WORDS } from '../wordmap';
import { SPELLING_EXCEPTIONS, spellingKey } from './check';
import { quranOrder } from './build';

// Checks the committed word card files against the committed Tanzil verses: the whole Quran.
const read = <T>(f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8')) as T;
const verses = read<Verses>('verses.json');
const galaxy = read<Galaxy>('galaxy.json');
const tags = read<MorphTags>('morph/tags.json');
const surahs = Array.from({ length: 114 }, (_, i) => read<SurahMorph>(`morph/${i + 1}.json`));
const segText = (row: MorphRow) => row.slice(2).filter((_, i) => i % 2 === 0) as string[];

describe('word card data over the whole Quran', () => {
  it('has a row for every Tanzil word, and the joined segments spell it', () => {
    let words = 0;
    const bad: string[] = [];
    for (const key of quranOrder(verses)) {
      const [s, a] = key.split(':').map(Number) as [number, number];
      const text = verses[key]!.ar.split(' ');
      const rows = surahs[s - 1]![a - 1]!;
      expect(rows.length, key).toBe(text.length);
      rows.forEach((e, i) => {
        words++;
        if (typeof e === 'number') {
          // Second word of a joined pair: the first word spells both.
          expect(JOINED_WORDS[key], key).toBe(e);
          return;
        }
        const joined = typeof rows[i + 1] === 'number';
        const tanzil = joined ? text[i]! + text[i + 1]! : text[i]!;
        const corpusWord = JOINED_WORDS[key] !== undefined && i + 1 > JOINED_WORDS[key]! ? i : i + 1;
        if (SPELLING_EXCEPTIONS.has(`${key}:${corpusWord}`)) return;
        if (spellingKey(segText(e).join('')) !== spellingKey(tanzil)) bad.push(`${key}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
    expect(words).toBe(77_429 + 4);
  });

  it('handles the 4 joined-word verses', () => {
    for (const key of Object.keys(JOINED_WORDS) as VerseKey[]) {
      const [s, a] = key.split(':').map(Number) as [number, number];
      const rows = surahs[s - 1]![a - 1]!;
      expect(rows.filter((e) => typeof e === 'number'), key).toHaveLength(1);
    }
  });

  it('points to real roots, lemmas and tags', () => {
    const particles = read<Particles>('particles.json');
    for (const surah of surahs)
      for (const verse of surah)
        for (const e of verse) {
          if (typeof e === 'number') continue;
          const [root, lemma] = e as [number, number];
          if (root >= 0) expect(galaxy.roots[root]!.lemmas[lemma]).toBeDefined();
          else if (lemma >= 0) expect(particles.lemmas[lemma]).toBeDefined();
          for (let i = 3; i < e.length; i += 2) expect(tags[e[i] as number]).toBeDefined();
        }
  });

  it('gives 2:30 word 10 (قَالُوٓا۟) the root قول and a verb stem with a pronoun suffix', () => {
    const row = surahs[1]![29]![9] as MorphRow;
    expect(galaxy.roots[row[0] as number]!.ar).toBe('قول');
    expect(segText(row)).toEqual(['قَالُ', 'وٓا۟']);
    expect(tags[row[3] as number]).toBe('V|PERF|VF:1|3MP');
    expect(tags[row[5] as number]).toBe('N|PRON|SUFF|3MP');
  });
});
