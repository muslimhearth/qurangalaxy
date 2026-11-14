import { useEffect, useState } from 'react';
import { loadLemmaIndex, loadOccurrences, loadVerses } from '../data/load';
import { lemmaOccurrences } from '../data/lemmaIndex';
import type { Occurrence, Root, Verses } from '../data/types';
import { useGalaxyStore } from '../state/store';
import type { CardWord } from './cardStore';
import { particleOccurrences, sameForm, wordStarts } from './counts';
import { loadMorphTags, loadParticles, loadSurahMorph, wordAt, type MorphWord } from './word';

/** Everything the word card shows about one word. */
export interface WordData {
  word: MorphWord;
  /** The word as Tanzil writes it. */
  text: string;
  /** The word's root, or undefined for a word without a root. */
  root?: Root;
  /** Lemma in Arabic and its English meanings (empty for particles). */
  lemma: { ar: string; en: string[] } | null;
  /** Verses with the same Tanzil spelling (same root or particle lemma). */
  form: Occurrence[];
  /** Verses with the same lemma. */
  lemmaList: Occurrence[];
  /** Verses with the same root. */
  rootList?: Occurrence[];
  verses: Verses;
}

/** Loading state of `useWordData`. */
export type WordDataState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: WordData };

// The global word index table is built once from the verse texts.
let starts: ReturnType<typeof wordStarts> | null = null;

/** Loads and assembles the word card data for `word` (surah file, tags, verses, occurrences). */
export async function loadWordData(word: CardWord, roots: Root[]): Promise<WordData | null> {
  const [s, a] = word.verse.split(':').map(Number) as [number, number];
  const [surah, tags, verses] = await Promise.all([loadSurahMorph(s), loadMorphTags(), loadVerses()]);
  const w = wordAt(surah, tags, a, word.pos);
  if (!w) return null;
  const text = verses[word.verse]?.ar.split(' ')[w.pos - 1] ?? '';
  if (w.root !== null) {
    const [occurrences, lemmas] = await Promise.all([loadOccurrences(), loadLemmaIndex()]);
    const rootList = occurrences[w.root] ?? [];
    const root = roots[w.root];
    const lemma = w.lemma === null ? undefined : root?.lemmas[w.lemma];
    const lemmaList = w.lemma === null ? [] : lemmaOccurrences(rootList, lemmas[w.root] ?? [], w.lemma);
    return {
      word: w,
      text,
      root,
      lemma: lemma ? { ar: lemma.ar, en: lemma.en } : null,
      form: sameForm(rootList, verses, text),
      lemmaList,
      rootList,
      verses,
    };
  }
  if (w.lemma === null) return { word: w, text, lemma: null, form: [], lemmaList: [], verses };
  const particles = await loadParticles();
  starts ??= wordStarts(verses);
  const lemmaList = particleOccurrences(particles.words[w.lemma] ?? [], starts);
  return {
    word: w,
    text,
    lemma: { ar: particles.lemmas[w.lemma] ?? '', en: [] },
    form: sameForm(lemmaList, verses, text),
    lemmaList,
    verses,
  };
}

/** The word card data for `word`; reloads when the word changes. */
export function useWordData(word: CardWord | null): WordDataState {
  const roots = useGalaxyStore((s) => s.galaxy?.roots);
  const [state, setState] = useState<{ key: string; value: WordDataState } | null>(null);
  const key = word ? `${word.verse}:${word.pos}` : '';
  useEffect(() => {
    if (!word || !roots) return;
    let active = true;
    loadWordData(word, roots).then(
      (data) => active && setState({ key, value: data ? { status: 'ready', data } : { status: 'error' } }),
      () => active && setState({ key, value: { status: 'error' } }),
    );
    return () => {
      active = false;
    };
    // `key` names the word; the object itself changes on every open.
  }, [key, roots]);
  return state?.key === key ? state.value : { status: 'loading' };
}
