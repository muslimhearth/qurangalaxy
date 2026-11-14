import type { Occurrences } from '../../src/data/types';
import type { LemmaIndex } from '../../src/data/lemmaIndex';
import type { RootWord } from './morphology';
import { toTextPosition } from './wordmap';

/** The parts of a root the lemma index needs. */
interface RootLemmas {
  ar: string;
  lemmas: { ar: string }[];
}

/**
 * Builds lemmas.json: for root i, the index (in `roots[i].lemmas`) of the lemma of each word in
 * `occurrences[i]`, flattened in occurrence order (verse by verse, word by word).
 * A word with two segments of the same root keeps the first segment's lemma, as `aggregateRoots` does.
 */
export function buildLemmaIndex(rootWords: RootWord[], roots: RootLemmas[], occurrences: Occurrences): LemmaIndex {
  // "root|verse|textWord" -> lemma text, first segment wins.
  const lemmaAt = new Map<string, string>();
  for (const w of rootWords) {
    const key = `${w.root}|${w.verse}|${toTextPosition(w.verse, w.word)}`;
    if (!lemmaAt.has(key)) lemmaAt.set(key, w.lemma);
  }
  return roots.map((root, i) => {
    const index = new Map(root.lemmas.map((l, li) => [l.ar, li]));
    return (occurrences[i] ?? []).flatMap((o) =>
      o.w.map((pos) => {
        const li = index.get(lemmaAt.get(`${root.ar}|${o.v}|${pos}`) ?? '');
        if (li === undefined) throw new Error(`No lemma for root ${root.ar} at ${o.v} word ${pos}`);
        return li;
      }),
    );
  });
}
