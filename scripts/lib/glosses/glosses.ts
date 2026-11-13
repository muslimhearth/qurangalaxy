/**
 * Combines Wiktionary and the translation fallback into English meanings for every root
 * and lemma. Pure: all inputs are passed in.
 */
import type { WikiCache } from './cache';
import { distinctiveWords, documentFrequencies } from './fallback';
import { titleGuesses } from './fetch-plan';
import { lemmaGlosses, matchDerived, rankEntries, type EntryLookup } from './match';
import { dedupeGlosses, glossKey, parseLemmaPage, parseRootAppendix, type RootAppendix, type WikiEntry } from './pages';
import { glossSupport, verseStems } from './support';

/** Most meanings kept per root and per lemma. */
export const MAX_ROOT = 4;
export const MAX_LEMMA = 3;
/** Lemma fallback needs at least this many verses to be trusted. */
const MIN_LEMMA_VERSES = 5;
/** Share of a lemma's (root's) verses that must contain a fallback word. */
const LEMMA_SHARE = 0.6;
const ROOT_SHARE = 0.2;
/** Share of a root's verses (at least one) whose translation must support an appendix meaning. */
const SUPPORT_SHARE = 0.01;

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

/** Form-of targets of candidate lemma entries whose pages are not cached yet (fetched in a second round). */
export function formOfTargets(roots: GlossRoot[], wiki: WikiCache): string[] {
  const lookup = entryLookup(wiki);
  const out = new Set<string>();
  for (const r of roots) {
    for (const l of r.lemmas) {
      for (const { entry } of rankEntries(l.ar, r.ar, lookup)) {
        for (const f of entry.formOf) for (const t of titleGuesses(f.target)) if (!(t in wiki.pages)) out.add(t);
      }
    }
  }
  return [...out];
}

/**
 * Root meanings from the appendix. Appendix pages often list etymological or rare senses
 * ("coryza" for أرض), so a meaning stays only when a lemma shares it or the root's verses
 * use it. Meanings the verses use most come first (صبر: patience before binding); when two or
 * more are used, unused ones are dropped (بحر: no "noble or great man").
 */
function appendixMeanings(app: RootAppendix, lemmaGlosses: string[][], verses: Set<string>[]): string[] {
  if (app.glosses.length === 0) return [];
  const key = (g: string) => glossKey(g.replace(/^to /, ''));
  const shared = new Set(lemmaGlosses.flat().map(key));
  const min = Math.max(1, Math.ceil(SUPPORT_SHARE * verses.length));
  const scored = app.glosses.map((g) => ({ g, support: glossSupport(g, verses) }));
  const kept = scored.filter((x) => shared.has(key(x.g)) || x.support >= min);
  const used = kept.filter((x) => x.support >= min);
  // Stable sort keeps the appendix order among equally used meanings.
  return (used.length >= 2 ? used : kept).sort((a, b) => b.support - a.support).map((x) => x.g);
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
      const texts = input.lemmaTexts[ri]?.[li] ?? [];
      let g = lemmaGlosses(l.ar, root.ar, lookup, texts.map(verseStems));
      if (g.length === 0) g = matchDerived(l.ar, app.derived);
      let source: LemmaSource = g.length > 0 ? 'wiktionary' : 'none';
      if (g.length === 0 && texts.length >= MIN_LEMMA_VERSES) {
        g = distinctiveWords(texts, df, total, LEMMA_SHARE);
        if (g.length > 0) source = 'fallback';
      }
      lemmas.push(dedupeGlosses(g).slice(0, MAX_LEMMA));
      sources.push(source);
    });

    const wikiLemmas = lemmas.filter((_, i) => sources[i] === 'wiktionary');
    let meanings = appendixMeanings(app, wikiLemmas, (input.rootTexts[ri] ?? []).map(verseStems));
    let source: RootSource = 'appendix';
    // The most frequent lemma's first meaning follows the root's own meanings (نور: light, fire).
    if (meanings.length > 0 && wikiLemmas[0]?.[0]) meanings.push(wikiLemmas[0][0]);
    if (meanings.length === 0) {
      meanings = lemmaMeanings(wikiLemmas);
      source = 'lemmas';
    }
    if (meanings.length === 0) {
      meanings = distinctiveWords(input.rootTexts[ri] ?? [], df, total, ROOT_SHARE);
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
