import type { VerseKey, Verses } from '../../../src/data/types';
import type { MorphEntry, MorphRow, Particles, SurahMorph } from '../../../src/morph/types';
import { JOINED_WORDS } from '../wordmap';
import { matchesTanzil } from './check';
import { parseCorpusWords, type CorpusSegment } from './parse';

/** The parts of a root the build needs. */
interface RootLemmas {
  ar: string;
  lemmas: { ar: string }[];
}

/** Output of `buildMorph`. */
export interface MorphBuild {
  /** Index surah-1. */
  surahs: SurahMorph[];
  tags: string[];
  particles: Particles;
  /** Problems found; the build must stop when this is not empty. */
  errors: string[];
}

/** Verse keys in Quran order (surah, then ayah). */
export function quranOrder(verses: Verses): VerseKey[] {
  const n = (k: string) => k.split(':').map(Number) as [number, number];
  return (Object.keys(verses) as VerseKey[]).sort((a, b) => n(a)[0] - n(b)[0] || n(a)[1] - n(b)[1]);
}

/** The stem: the first segment that is not a prefix (a word of prefixes only: its first segment). */
function stemOf(segments: CorpusSegment[]): CorpusSegment {
  return segments.find((s) => !s.tag.split('|').includes('PREF')) ?? segments[0]!;
}

/**
 * Builds the word card data from the Corpus morphology file and the Tanzil verses:
 * per-surah word rows, the shared tag table and the root-less (particle) lemma index.
 * Checks that every Corpus word spells its Tanzil word (see `matchesTanzil`) and that every
 * Tanzil word gets a row. `joined` maps the verses where the Corpus joins two Tanzil words.
 */
export function buildMorph(
  morphText: string,
  verses: Verses,
  roots: RootLemmas[],
  joined: Partial<Record<VerseKey, number>> = JOINED_WORDS,
): MorphBuild {
  const errors: string[] = [];
  const tags: string[] = [];
  const tagIds = new Map<string, number>();
  const tagId = (t: string) => {
    let id = tagIds.get(t);
    if (id === undefined) tagIds.set(t, (id = tags.push(t) - 1));
    return id;
  };
  const rootIds = new Map(roots.map((r, i) => [r.ar, i]));
  const lemmaIds = roots.map((r) => new Map(r.lemmas.map((l, i) => [l.ar, i])));
  const particles: Particles = { lemmas: [], words: [] };
  const particleIds = new Map<string, number>();
  const particleLast: number[] = [];

  // Rows per verse, filled at Tanzil positions.
  const rows = new Map<VerseKey, MorphEntry[]>();
  for (const w of parseCorpusWords(morphText)) {
    const verse = verses[w.verse];
    if (!verse) {
      errors.push(`${w.verse}: no Tanzil verse`);
      continue;
    }
    const text = verse.ar.split(' ');
    const join = joined[w.verse];
    const pos = join !== undefined && w.word > join ? w.word + 1 : w.word;
    const tanzil = join === w.word ? `${text[pos - 1]} ${text[pos]}` : (text[pos - 1] ?? '');
    const segments = w.segments.map((s) => s.text);
    if (!matchesTanzil(w.verse, w.word, segments, tanzil)) {
      errors.push(`${w.verse} word ${pos}: Corpus ${segments.join('+')} does not spell Tanzil ${tanzil}`);
    }

    let root = -1;
    let lemma = -1;
    // The root and lemma of the word: its first root segment (as the lemma index does).
    const rooted = w.segments.find((s) => s.root !== undefined);
    if (rooted) {
      root = rootIds.get(rooted.root!) ?? -1;
      lemma = root < 0 ? -1 : (lemmaIds[root]!.get(rooted.lemma ?? '') ?? -1);
      if (lemma < 0) errors.push(`${w.verse} word ${pos}: unknown root ${rooted.root} or lemma ${rooted.lemma}`);
    } else {
      const name = stemOf(w.segments).lemma;
      if (name !== undefined) {
        lemma = particleIds.get(name) ?? -1;
        if (lemma < 0) {
          particleIds.set(name, (lemma = particles.lemmas.push(name) - 1));
          particles.words.push([]);
        }
      }
    }
    const row: MorphRow = [root, lemma, ...w.segments.flatMap((s) => [s.text, tagId(s.tag)])];
    let list = rows.get(w.verse);
    if (!list) rows.set(w.verse, (list = []));
    list[pos - 1] = row;
    if (join === w.word) list[pos] = pos;
  }

  // Surah files in Quran order, plus the global word indices of the particles.
  const surahs: SurahMorph[] = [];
  let base = 0;
  for (const key of quranOrder(verses)) {
    const [s] = key.split(':').map(Number) as [number];
    const count = verses[key]!.ar.split(' ').length;
    const list = rows.get(key) ?? [];
    const entries: MorphEntry[] = [];
    for (let i = 0; i < count; i++) {
      const e = list[i];
      if (e === undefined) {
        errors.push(`${key} word ${i + 1}: no Corpus word`);
        entries.push([-1, -1]);
        continue;
      }
      entries.push(e);
      if (typeof e !== 'number' && e[0] === -1 && (e[1] as number) >= 0) {
        const id = e[1] as number;
        particles.words[id]!.push(base + i - (particleLast[id] ?? 0));
        particleLast[id] = base + i;
      }
    }
    (surahs[s - 1] ??= []).push(entries);
    base += count;
  }
  return { surahs, tags, particles, errors };
}
