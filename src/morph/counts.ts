import type { Occurrence, VerseKey, Verses } from '../data/types';
import { SURAHS, surahVerseKeys } from '../reader/surahs';

/** Number of words in a list of occurrences. */
export function wordTotal(list: readonly Occurrence[]): number {
  return list.reduce((n, o) => n + o.w.length, 0);
}

/**
 * "Same form": the words of `list` spelled exactly `text` (Tanzil spelling, with all marks).
 * `list` is the word's root (or particle lemma) occurrences, so homographs from other roots stay out.
 */
export function sameForm(list: readonly Occurrence[], verses: Verses, text: string): Occurrence[] {
  const result: Occurrence[] = [];
  for (const o of list) {
    const words = verses[o.v]?.ar.split(' ') ?? [];
    const w = o.w.filter((p) => words[p - 1] === text);
    if (w.length > 0) result.push({ v: o.v, w });
  }
  return result;
}

/** First global word index of each verse, in Quran order (see `Particles`). */
export interface WordStarts {
  keys: VerseKey[];
  starts: number[];
}

/** Builds the global word index table from the verse texts. */
export function wordStarts(verses: Verses): WordStarts {
  const keys = SURAHS.flatMap((_, i) => surahVerseKeys(i + 1));
  const starts: number[] = [];
  let n = 0;
  for (const k of keys) {
    starts.push(n);
    n += verses[k]?.ar.split(' ').length ?? 0;
  }
  return { keys, starts };
}

/** Turns delta-coded global word indices (`Particles.words[i]`) into occurrences. */
export function particleOccurrences(deltas: readonly number[], table: WordStarts): Occurrence[] {
  const result: Occurrence[] = [];
  let index = 0;
  let verse = 0;
  for (const d of deltas) {
    index += d;
    while (verse + 1 < table.starts.length && table.starts[verse + 1]! <= index) verse++;
    const v = table.keys[verse]!;
    const pos = index - table.starts[verse]! + 1;
    const last = result.at(-1);
    if (last?.v === v) last.w.push(pos);
    else result.push({ v, w: [pos] });
  }
  return result;
}
