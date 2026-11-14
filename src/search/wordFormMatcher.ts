/** Roots search by any Quran word form: "ظهورها" finds ظهر through ظُهُورِهَا. */
import { arabicKey, arabicWords } from './arabicKey';
import { TIER, type Match, type Matcher } from './types';
import { currentWordForms } from './wordFormsLoad';
import { exactForms, prefixForms, type FormHit, type WordFormIndex } from './wordForms';

// A whole Quran word scores just under an exact root or lemma hit, so those keep their reason.
const WORD_EXACT = TIER.exact - 0.01;
// A root that is only a small share of a word form's uses loses up to this much (stays in its tier).
const SHARE_PENALTY = 0.1;
/** Fewest key letters for a word-start search; shorter keys start thousands of words. */
const PREFIX_MIN = 3;
/** Most roots a word-start search adds per query word. */
const PREFIX_ROOTS = 10;

/** Scores hits inside one tier by their share of the matching words. */
function scored(hits: FormHit[], top: number, limit = hits.length): Match[] {
  const total = hits.reduce((s, h) => s + h.count, 0);
  return hits.slice(0, limit).map((h) => ({
    id: h.id,
    score: top - SHARE_PENALTY * (1 - h.count / total),
    reason: { kind: 'arabic', text: h.surface },
  }));
}

/** Matches of one query word: whole Quran words first, then (3+ letters) word starts. */
function wordMatches(index: WordFormIndex, word: string): Match[] {
  const exact = scored(exactForms(index, word), WORD_EXACT);
  if (arabicKey(word).length < PREFIX_MIN) return exact;
  return [...exact, ...scored(prefixForms(index, word), TIER.prefix, PREFIX_ROOTS)];
}

/** Builds the matcher on an index source (the loaded wordforms.json in the app; a fake in tests). */
export function makeWordFormMatcher(getIndex: () => WordFormIndex | null): Matcher {
  return (_roots, query) => {
    const index = getIndex();
    if (!index) return [];
    const best = new Map<number, Match>();
    for (const word of arabicWords(query)) {
      for (const m of wordMatches(index, word)) {
        const old = best.get(m.id);
        if (!old || m.score > old.score) best.set(m.id, m);
      }
    }
    return [...best.values()];
  };
}

/**
 * Finds roots by the inflected words of the Quran (word-form index). Returns [] until
 * wordforms.json has loaded (see `useWordForms`).
 */
export const wordFormMatcher: Matcher = makeWordFormMatcher(currentWordForms);
