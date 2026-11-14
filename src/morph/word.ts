import { loadJson } from '../data/load';
import type { Segment } from './grammar';
import type { MorphTags, Particles, SurahMorph } from './types';

/** One Quran word with its Corpus analysis. */
export interface MorphWord {
  /** 1-based Tanzil word position that holds the analysis (the first word of a joined pair). */
  pos: number;
  /** Root id, or null for a word without a root. */
  root: number | null;
  /** Lemma index in the root's lemmas, or in `Particles.lemmas` when `root` is null. */
  lemma: number | null;
  segments: Segment[];
}

/** Loads public/data/morph/{surah}.json (once per surah). */
export const loadSurahMorph = (surah: number) => loadJson<SurahMorph>(`morph/${surah}.json`);
/** Loads public/data/morph/tags.json. */
export const loadMorphTags = () => loadJson<MorphTags>('morph/tags.json');
/** Loads public/data/particles.json. */
export const loadParticles = () => loadJson<Particles>('particles.json');

/** The analysis of Tanzil word `pos` (1-based) of verse `ayah`, or null when missing. */
export function wordAt(surah: SurahMorph, tags: MorphTags, ayah: number, pos: number): MorphWord | null {
  const verse = surah[ayah - 1];
  let entry = verse?.[pos - 1];
  // The second word of a joined pair points to the first.
  if (typeof entry === 'number') {
    pos = entry;
    entry = verse?.[pos - 1];
  }
  if (!entry || typeof entry === 'number') return null;
  const [root, lemma, ...flat] = entry as [number, number, ...(string | number)[]];
  const segments: Segment[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) segments.push({ text: flat[i] as string, tag: tags[flat[i + 1] as number] ?? '' });
  return { pos, root: root >= 0 ? root : null, lemma: lemma >= 0 ? lemma : null, segments };
}
