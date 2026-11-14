import type { Occurrence } from './types';

/**
 * Contents of public/data/lemmas.json (built by `pnpm data:reader`). Index i belongs to root i:
 * the index in `Root.lemmas` of each word of `Occurrences[i]`, flattened in occurrence order
 * (verse by verse, then word by word). Kept outside `types.ts`: an app-side extra, loaded lazily.
 */
export type LemmaIndex = number[][];

/**
 * The occurrences of one lemma: the verses of `occurrences` with a word of lemma `lemma`, each
 * with only that lemma's word positions. `lemmas` is the root's row of the `LemmaIndex`.
 */
export function lemmaOccurrences(occurrences: readonly Occurrence[], lemmas: readonly number[], lemma: number): Occurrence[] {
  const result: Occurrence[] = [];
  let i = 0;
  for (const o of occurrences) {
    const w = o.w.filter((_, k) => lemmas[i + k] === lemma);
    i += o.w.length;
    if (w.length > 0) result.push({ v: o.v, w });
  }
  return result;
}
