/**
 * Combines Wiktionary and the translation fallback into English meanings for every root
 * and lemma. Pure: all inputs are passed in.
 */
import type { WikiCache } from './cache';
import { distinctiveWords, documentFrequencies } from './fallback';
import { titleGuesses } from './fetch-plan';
import { lemmaGlosses, matchDerived, matchEntry, type EntryLookup } from './match';
import { dedupeGlosses, glossKey, parseLemmaPage, parseRootAppendix, type RootAppendix, type WikiEntry } from './pages';

/** Most meanings kept per root and per lemma. */
export const MAX_ROOT = 4;
export const MAX_LEMMA = 3;
/** Lemma fallback needs at least this many verses to be trusted. */
const MIN_LEMMA_VERSES = 3;

/** A root and its lemmas (sorted by count, highest first). */
export interface GlossRoot {
  ar: string;
  lemmas: { ar: string; count: number }[];
}

/** Everything the gloss step reads. */
export interface GlossInput {
  roots: GlossRoot[];
  wiki: WikiCache;
  /** English text of each verse of each root, in root order. */
  rootTexts: string[][];
  /** English text of each verse of each lemma: lemmaTexts[root][lemma]. */
  lemmaTexts: string[][][];
  /** English text of every verse in the Quran. */
  allTexts: string[];
}

/** Where a root's meanings came from. */
export type RootSource = 'appendix' | 'lemmas' | 'fallback' | 'none';
/** Where a lemma's meanings came from. */
export type LemmaSource = 'wiktionary' | 'fallback' | 'none';

/** Meanings per root and lemma, with their sources. */
export interface GlossResult {
  roots: string[][];
  lemmas: string[][][];
  rootSource: RootSource[];
  lemmaSource: LemmaSource[][];
}

/** Parses cached lemma pages on demand, once each. */
function entryLookup(wiki: WikiCache): EntryLookup {
  const parsed = new Map<string, WikiEntry[]>();
  return (title) => {
    let entries = parsed.get(title);
    if (!entries) {
      const text = wiki.pages[title];
      entries = text ? parseLemmaPage(title, text) : [];
      parsed.set(title, entries);
    }
    return entries;
  };
}

/** Form-of targets of matched lemmas whose pages are not cached yet (fetched in a second round). */
export function formOfTargets(roots: GlossRoot[], wiki: WikiCache): string[] {
  const lookup = entryLookup(wiki);
  const out = new Set<string>();
  for (const r of roots) {
    for (const l of r.lemmas) {
      const e = matchEntry(l.ar, r.ar, lookup);
      if (!e || e.glosses.length > 0) continue;
      for (const f of e.formOf) for (const t of titleGuesses(f.target)) if (!(t in wiki.pages)) out.add(t);
    }
  }
  return [...out];
}

/** Root meanings from the appendix, those shared with its lemmas first. */
function appendixMeanings(app: RootAppendix, lemmaGlosses: string[][]): string[] {
  const shared = new Set(lemmaGlosses.flat().map((g) => glossKey(g.replace(/^to /, ''))));
  const isShared = (g: string) => shared.has(glossKey(g.replace(/^to /, '')));
  return [...app.glosses.filter(isShared), ...app.glosses.filter((g) => !isShared(g))];
}

/** First glosses of the top lemmas, then their second glosses, and so on. */
function lemmaMeanings(lemmaGlosses: string[][]): string[] {
  const out: string[] = [];
  for (let round = 0; round < MAX_LEMMA; round++) for (const g of lemmaGlosses) if (g[round]) out.push(g[round]!);
  return dedupeGlosses(out);
}

/** Builds the English meanings of every root and lemma. */
export function buildGlosses(input: GlossInput): GlossResult {
  const lookup = entryLookup(input.wiki);
  const df = documentFrequencies(input.allTexts);
  const total = input.allTexts.length;
  const result: GlossResult = { roots: [], lemmas: [], rootSource: [], lemmaSource: [] };

  input.roots.forEach((root, ri) => {
    const text = input.wiki.appendix[root.ar];
    const app = text ? parseRootAppendix(text) : { glosses: [], derived: [] };

    const lemmas: string[][] = [];
    const sources: LemmaSource[] = [];
    root.lemmas.forEach((l, li) => {
      let g = lemmaGlosses(l.ar, root.ar, lookup);
      if (g.length === 0) g = matchDerived(l.ar, app.derived);
      let source: LemmaSource = g.length > 0 ? 'wiktionary' : 'none';
      const texts = input.lemmaTexts[ri]?.[li] ?? [];
      if (g.length === 0 && texts.length >= MIN_LEMMA_VERSES) {
        g = distinctiveWords(texts, df, total);
        if (g.length > 0) source = 'fallback';
      }
      lemmas.push(dedupeGlosses(g).slice(0, MAX_LEMMA));
      sources.push(source);
    });

    const wikiLemmas = lemmas.filter((_, i) => sources[i] === 'wiktionary');
    let meanings = appendixMeanings(app, wikiLemmas);
    let source: RootSource = 'appendix';
    if (meanings.length === 0) {
      meanings = lemmaMeanings(wikiLemmas);
      source = 'lemmas';
    }
    if (meanings.length === 0) {
      meanings = distinctiveWords(input.rootTexts[ri] ?? [], df, total);
      source = meanings.length > 0 ? 'fallback' : 'none';
    }
    result.roots.push(dedupeGlosses(meanings).slice(0, MAX_ROOT));
    result.rootSource.push(source);
    result.lemmas.push(lemmas);
    result.lemmaSource.push(sources);
  });
  return result;
}

/** Coverage counts: roots per source, lemmas per source and Quran words per lemma source. */
export function glossStats(roots: GlossRoot[], result: GlossResult) {
  const count = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  const stats = {
    roots: count(['appendix', 'lemmas', 'fallback', 'none'] as const),
    lemmas: count(['wiktionary', 'fallback', 'none'] as const),
    words: count(['wiktionary', 'fallback', 'none'] as const),
  };
  result.rootSource.forEach((s) => stats.roots[s]++);
  roots.forEach((r, ri) =>
    r.lemmas.forEach((l, li) => {
      const s = result.lemmaSource[ri]![li]!;
      stats.lemmas[s]++;
      stats.words[s] += l.count;
    }),
  );
  return stats;
}
