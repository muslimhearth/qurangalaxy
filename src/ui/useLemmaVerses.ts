import { useEffect, useMemo, useState } from 'react';
import { loadLemmaIndex } from '../data/load';
import { lemmaOccurrences, type LemmaIndex } from '../data/lemmaIndex';
import type { Occurrence } from '../data/types';

/** Result of `useLemmaVerses`: the filtered occurrences, or why there are none yet. */
export type LemmaVerses = { status: 'off' | 'loading' | 'error' } | { status: 'ready'; occurrences: Occurrence[] };

/**
 * The occurrences of root `rootId` limited to lemma `lemma` (an index in `Root.lemmas`), with only
 * that lemma's words marked. Loads lemmas.json (cached) the first time a lemma is given.
 */
export function useLemmaVerses(rootId: number, occurrences: Occurrence[], lemma: number | null): LemmaVerses {
  const [index, setIndex] = useState<LemmaIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const wanted = lemma !== null;

  useEffect(() => {
    if (!wanted || index) return;
    let active = true;
    loadLemmaIndex().then(
      (i) => active && setIndex(i),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [wanted, index]);

  return useMemo((): LemmaVerses => {
    if (lemma === null) return { status: 'off' };
    if (!index) return { status: failed ? 'error' : 'loading' };
    return { status: 'ready', occurrences: lemmaOccurrences(occurrences, index[rootId] ?? [], lemma) };
  }, [lemma, index, failed, occurrences, rootId]);
}
