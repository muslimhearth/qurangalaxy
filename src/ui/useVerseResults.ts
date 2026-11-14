import { useDeferredValue, useMemo } from 'react';
import type { Verses } from '../data/types';
import type { SemanticService } from '../semantic/service';
import { useSemanticVerses, type SemanticState } from '../semantic/useSemanticSearch';
import type { VerseHit } from '../semantic/aggregate';
import { isArabicQuery } from '../search/arabicKey';
import { meaningWeight } from '../search/blend';
import { useWordForms } from '../search/useWordForms';
import { arabicIndexFor, arabicVerseMatches } from '../verses/arabic';
import { blendVerseMatches } from '../verses/blend';
import { buildVerseIndex, exactVerseMatches, type VerseMatch } from '../verses/exact';
import type { Translit } from '../verses/translit';
import { useTypos } from './typos';
import { useTranslit } from './useTranslit';
import { useVerseTexts } from './useVerseTexts';

/** Number of verses in the result list. */
export const VERSE_LIMIT = 30;
/** Exact matches considered before blending (more than shown, so meaning can reorder them). */
const EXACT_POOL = 100;

/** What the verse result list needs. */
export interface VerseResults {
  /** False until verses.json (and, for non-Arabic queries, the transliteration or its failure) has loaded. */
  ready: boolean;
  matches: VerseMatch[];
  verses: Verses | null;
  translit: Translit | null;
  semantic: SemanticState<VerseHit>;
  /** True while meaning results are still on their way. */
  pending: boolean;
}

/**
 * Verse search for `query` while `enabled`: exact words in English and transliteration
 * (also small typos while the "Typo tolerance" setting is on),
 * blended with meaning (semantic) search by `weight`. Arabic queries search the Arabic text
 * (words and other forms of their roots) without meaning search.
 */
export function useVerseResults(
  query: string,
  enabled: boolean,
  weight: number,
  getService: () => SemanticService,
): VerseResults {
  const verses = useVerseTexts(enabled);
  const { translit, failed } = useTranslit(enabled);
  const textsReady = verses !== null && (translit !== null || failed);
  const index = useMemo(
    () => (textsReady ? buildVerseIndex(verses, translit ?? {}) : null),
    [textsReady, verses, translit],
  );

  // Exact search reads every verse; let typing stay smooth while it catches up.
  const q = useDeferredValue(enabled ? query.trim() : '');
  // Arabic queries search the Arabic text only, so they need no transliteration.
  const arabic = isArabicQuery(q);
  const ready = arabic ? verses !== null : textsReady;
  // Root forms of an Arabic word come from the word-form index (loaded on the first Arabic query).
  const forms = useWordForms(enabled && isArabicQuery(query));
  // "Typo tolerance" in the search settings: near spellings in English and transliteration.
  const typos = useTypos((s) => s.on);
  const exact = useMemo(() => {
    if (!q) return [];
    if (arabic) return verses ? arabicVerseMatches(arabicIndexFor(verses), q, forms, EXACT_POOL) : [];
    return index ? exactVerseMatches(index, q, EXACT_POOL, typos) : [];
  }, [index, verses, q, arabic, forms, typos]);
  const semantic = useSemanticVerses(enabled ? query : '', enabled ? weight : 0, getService);
  // The slider keeps its value; Arabic queries just use exact search alone.
  const mix = meaningWeight(q, weight);
  const matches = useMemo(
    () => blendVerseMatches(exact, semantic.matches ?? [], mix, VERSE_LIMIT),
    [exact, semantic.matches, mix],
  );
  const pending = enabled && mix > 0 && semantic.matches === null && semantic.status !== 'error';
  return { ready, matches, verses, translit, semantic, pending };
}
