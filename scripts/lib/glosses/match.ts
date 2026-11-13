/**
 * Matches a corpus lemma (vocalized, with its root) to a Wiktionary entry.
 */
import { lemmaKey, looseKey, rootKey, vowelScore } from './arabic';
import { titleGuesses } from './fetch-plan';
import type { RootAppendix, WikiEntry } from './pages';

/** Returns the parsed entries of a page title ([] when missing). */
export type EntryLookup = (title: string) => WikiEntry[];

/** Senses of these kinds may borrow the target's glosses; participles may not ("sayer" is not "to say"). */
const BORROW = /^(plural|alt|alternative|feminine|masculine|inflection|singulative|collective|broken plural|verbal noun|synonym|obsolete|archaic|form)/;

/**
 * Best entry for a lemma: same root (or a page with no root), same letters (strictly, else
 * ignoring alefs), then the closest vowels. Entries of another root never match.
 */
export function matchEntry(lemma: string, root: string, lookup: EntryLookup): WikiEntry | undefined {
  const rk = rootKey(root);
  const strict = lemmaKey(lemma);
  const loose = looseKey(lemma);
  let best: WikiEntry | undefined;
  let bestScore = -Infinity;
  for (const title of titleGuesses(lemma)) {
    for (const e of lookup(title)) {
      if (e.root !== null && e.root !== rk) continue;
      const spelling = lemmaKey(e.head) === strict ? 2 : looseKey(e.head) === loose ? 1 : 0;
      if (spelling === 0 && lemmaKey(e.title) !== strict) continue;
      const useful = e.glosses.length > 0 || e.formOf.length > 0 ? 1 : 0;
      const score =
        (e.root === rk ? 1000 : 0) + useful * 100 + spelling * 10 + Math.max(-9, Math.min(9, vowelScore(lemma, e.head)));
      if (score > bestScore) {
        best = e;
        bestScore = score;
      }
    }
  }
  return best;
}

/** Glosses for a lemma from Wiktionary: its entry's own glosses, else one hop through a form-of sense. */
export function lemmaGlosses(lemma: string, root: string, lookup: EntryLookup): string[] {
  const e = matchEntry(lemma, root, lookup);
  if (!e) return [];
  if (e.glosses.length > 0) return e.glosses;
  for (const f of e.formOf) {
    if (!BORROW.test(f.kind)) continue;
    const target = matchEntry(f.target, root, lookup);
    if (target && target !== e && target.glosses.length > 0) {
      // A verbal noun names the action: "to know" becomes "know".
      return f.kind === 'verbal noun' ? target.glosses.map((g) => g.replace(/^to /, '')) : target.glosses;
    }
  }
  return [];
}

/** Glosses of the appendix derived term with the lemma's letters (closest vowels), or []. */
export function matchDerived(lemma: string, derived: RootAppendix['derived']): string[] {
  const key = lemmaKey(lemma);
  let best: string[] = [];
  let bestScore = -Infinity;
  for (const d of derived) {
    if (lemmaKey(d.word) !== key) continue;
    const s = vowelScore(lemma, d.word);
    if (s > bestScore) {
      best = d.glosses;
      bestScore = s;
    }
  }
  return best;
}
