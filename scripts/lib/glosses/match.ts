/**
 * Matches a corpus lemma (vocalized, with its root) to a Wiktionary entry.
 */
import { lemmaKey, looseKey, rootKey, vowelScore } from './arabic';
import { titleGuesses } from './fetch-plan';
import type { RootAppendix, WikiEntry } from './pages';
import { supportShare } from './support';

/** Returns the parsed entries of a page title ([] when missing). */
export type EntryLookup = (title: string) => WikiEntry[];

/** Senses of these kinds may borrow the target's glosses; participles may not ("sayer" is not "to say"). */
const BORROW = /^(plural|alt|alternative|feminine|masculine|inflection|singulative|collective|broken plural|verbal noun|synonym|obsolete|archaic|form)/;

// Corpus verb lemmas end in a fatha (قالَ) or a long a after one (رَأَى, دَعا); nouns carry no case vowel.
const VERB_LEMMA = /َ$|َ[اى]$/;
const HARAKAT = /[ً-ْ]/;
/** Weight of translation support (share of the lemma's verses that use a gloss) in the entry score. */
const SUPPORT_WEIGHT = 5;
/** How many glosses of an entry are checked against the translation. */
const SUPPORT_GLOSSES = 3;

/** A candidate entry with its structural score. */
export interface RankedEntry {
  entry: WikiEntry;
  score: number;
}

/**
 * Entries that may match a lemma, best first. Entries of another root never match; a page
 * often names its root only once, so entries without a root are allowed. Then, by weight:
 * the entry has glosses, the same letters (strictly, else ignoring alefs), the closest vowels,
 * the same verb/noun class, the named root, and no "form of" sense (a main entry first).
 */
export function rankEntries(lemma: string, root: string, lookup: EntryLookup): RankedEntry[] {
  const rk = rootKey(root);
  const strict = lemmaKey(lemma);
  const loose = looseKey(lemma);
  const isVerb = VERB_LEMMA.test(lemma);
  const out: RankedEntry[] = [];
  for (const title of titleGuesses(lemma)) {
    for (const e of lookup(title)) {
      if (e.root !== null && e.root !== rk) continue;
      const spelling = lemmaKey(e.head) === strict ? 2 : looseKey(e.head) === loose ? 1 : 0;
      if (spelling === 0 && lemmaKey(e.title) !== strict) continue;
      const useful = e.glosses.length > 0 || e.formOf.length > 0 ? 1 : 0;
      const vowels = HARAKAT.test(e.head) ? Math.max(-9, Math.min(9, vowelScore(lemma, e.head))) : -1;
      const score =
        useful * 100 +
        spelling * 20 +
        vowels +
        ((e.pos === 'Verb') === isVerb ? 4 : 0) +
        (e.root === rk ? 2 : 0) -
        (e.formOf.length > 0 ? 1 : 0);
      out.push({ entry: e, score });
    }
  }
  // Stable sort: on equal scores the earlier entry on the page wins.
  return out.sort((a, b) => b.score - a.score);
}

/** Best entry for a lemma by structure alone (see rankEntries). */
export function matchEntry(lemma: string, root: string, lookup: EntryLookup): WikiEntry | undefined {
  return rankEntries(lemma, root, lookup)[0]?.entry;
}

/** An entry's own glosses, else the glosses of its form-of target (one hop). */
function borrowed(e: WikiEntry, root: string, lookup: EntryLookup): string[] {
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

/**
 * Gloss options of one entry: its own glosses, and those of its form-of target (one hop).
 * An entry can have both (رِماح: "habit of kicking", and "plural of رُمْح" = spears).
 */
function options(e: WikiEntry, root: string, lookup: EntryLookup): { glosses: string[]; penalty: number }[] {
  const out = e.glosses.length > 0 ? [{ glosses: e.glosses, penalty: 0 }] : [];
  const b = borrowed(e, root, lookup);
  // A borrowed meaning is a little less direct than the entry's own.
  if (b.length > 0) out.push({ glosses: b, penalty: e.glosses.length > 0 ? 1 : 0 });
  return out;
}

/**
 * Glosses for a lemma from Wiktionary. Among entries of the same spelling, the one whose
 * glosses the lemma's verses use most wins (قَوْم "people" over "standing up", كُفْر
 * "disbelieve" over "pitch"); `verses` are the stemmed translations of those verses.
 */
export function lemmaGlosses(lemma: string, root: string, lookup: EntryLookup, verses: Set<string>[] = []): string[] {
  const ranked = rankEntries(lemma, root, lookup);
  const top = ranked[0]?.score ?? 0;
  let best: string[] = [];
  let bestScore = -Infinity;
  for (const { entry, score } of ranked) {
    // Only entries of the same spelling tier compete (spelling weighs 20 points).
    if (score < top - 19) break;
    for (const { glosses, penalty } of options(entry, root, lookup)) {
      const s = score - penalty + SUPPORT_WEIGHT * supportShare(glosses.slice(0, SUPPORT_GLOSSES), verses);
      if (s > bestScore) {
        best = glosses;
        bestScore = s;
      }
    }
  }
  return best;
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
