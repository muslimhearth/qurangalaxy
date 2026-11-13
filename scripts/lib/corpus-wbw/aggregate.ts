import { groupByVerse } from './coverage';
import type { MorphIndex } from './morph-index';
import { normalizeGloss } from './normalize';
import type { WbwWord } from './parse';

/** A normalized gloss and how many words carry it. */
export interface GlossCount {
  gloss: string;
  count: number;
}

/** Gloss summary of one lemma. */
export interface LemmaGlosses {
  /** Root of the lemma (absent for rootless lemmas such as particles). */
  root?: string;
  /** Number of glossed words with this lemma. */
  count: number;
  /** Most frequent normalized glosses, highest count first. */
  glosses: GlossCount[];
}

/** Gloss summary of one root, summed across its lemmas. */
export interface RootGlosses {
  /** Number of glossed words with this root. */
  count: number;
  /** Number of distinct lemmas of this root. */
  lemmas: number;
  /** Most frequent normalized glosses across all lemmas, highest count first. */
  glosses: GlossCount[];
}

/** Result of {@link aggregateGlosses}; the body of `data/derived/corpus-glosses.json`. */
export interface GlossAggregate {
  words: { total: number; withLemma: number; withRoot: number };
  lemmas: Record<string, LemmaGlosses>;
  roots: Record<string, RootGlosses>;
}

/** Result of {@link validateWordCounts}. */
export interface WordCountReport {
  /** Verses whose word count matches the morphology. */
  complete: number;
  /** Verses with no scraped words. */
  missing: string[];
  /** Verses whose scraped word count differs from the morphology. */
  mismatches: { verse: string; expected: number; actual: number }[];
}

/**
 * Merges the words of all cached pages into one word list per verse.
 * A verse can appear on two pages (cut short on one), so the longest list wins.
 */
export function collectVerses(pages: WbwWord[][]): Map<string, WbwWord[]> {
  const verses = new Map<string, WbwWord[]>();
  for (const page of pages) {
    for (const [verse, list] of groupByVerse(page)) {
      if (list.length > (verses.get(verse)?.length ?? 0)) verses.set(verse, list);
    }
  }
  return verses;
}

/** Compares scraped word counts per verse with the morphology word counts. */
export function validateWordCounts(verses: Map<string, WbwWord[]>, verseWordCounts: Map<string, number>): WordCountReport {
  const report: WordCountReport = { complete: 0, missing: [], mismatches: [] };
  for (const [verse, expected] of verseWordCounts) {
    const actual = verses.get(verse)?.length;
    if (actual === undefined) report.missing.push(verse);
    else if (actual === expected) report.complete++;
    else report.mismatches.push({ verse, expected, actual });
  }
  return report;
}

/** Turns a gloss→count map into the top `topN` entries, highest count first, ties alphabetical. */
function top(counts: Map<string, number>, topN: number): GlossCount[] {
  return [...counts]
    .map(([gloss, count]) => ({ gloss, count }))
    .sort((a, b) => b.count - a.count || a.gloss.localeCompare(b.gloss))
    .slice(0, topN);
}

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

/**
 * Aggregates scraped word glosses by lemma and by root, matching each word to the
 * morphology by location. Glosses are normalized with {@link normalizeGloss}; empty ones are skipped.
 */
export function aggregateGlosses(words: WbwWord[], index: MorphIndex, topN: number): GlossAggregate {
  const lemmaCounts = new Map<string, { root?: string; count: number; glosses: Map<string, number> }>();
  const rootCounts = new Map<string, { count: number; lemmas: Set<string>; glosses: Map<string, number> }>();
  const stats = { total: words.length, withLemma: 0, withRoot: 0 };
  for (const { location, gloss } of words) {
    const morph = index.words.get(location);
    if (!morph?.lemma) continue;
    const normalized = normalizeGloss(gloss, morph);
    if (normalized === '') continue;
    stats.withLemma++;
    const lemma = lemmaCounts.get(morph.lemma) ?? { root: morph.root, count: 0, glosses: new Map() };
    lemma.count++;
    bump(lemma.glosses, normalized);
    lemmaCounts.set(morph.lemma, lemma);
    if (!morph.root) continue;
    stats.withRoot++;
    const root = rootCounts.get(morph.root) ?? { count: 0, lemmas: new Set(), glosses: new Map() };
    root.count++;
    root.lemmas.add(morph.lemma);
    bump(root.glosses, normalized);
    rootCounts.set(morph.root, root);
  }
  const lemmas: Record<string, LemmaGlosses> = {};
  for (const [key, l] of lemmaCounts) {
    lemmas[key] = { ...(l.root ? { root: l.root } : {}), count: l.count, glosses: top(l.glosses, topN) };
  }
  const roots: Record<string, RootGlosses> = {};
  for (const [key, r] of rootCounts) {
    roots[key] = { count: r.count, lemmas: r.lemmas.size, glosses: top(r.glosses, topN) };
  }
  return { words: stats, lemmas, roots };
}
