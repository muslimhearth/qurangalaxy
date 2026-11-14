import type { Galaxy, Occurrences, VerseKey, Verses } from '../../src/data/types';
import { aggregateRoots, type RootStats } from './aggregate';
import { findMismatches, type Mismatch } from './align';
import { emptyCache, type WikiCache } from './glosses/cache';
import { buildGlosses, glossStats } from './glosses/glosses';
import { buildEdges } from './edges';
import { layoutGalaxy } from './layout';
import { parseMorphology, type RootWord } from './morphology';
import { parseTanzil, stripBasmala } from './tanzil';
import { transliterateRoot } from './transliterate';
import { validateData } from './validate';
import { checkJoinedWords, toTextPosition } from './wordmap';

/** How many strongest edges each root keeps before the union is taken. */
export const EDGES_PER_ROOT = 8;

/** Everything the build writes, plus diagnostics. */
export interface Dataset {
  galaxy: Galaxy;
  occurrences: Occurrences;
  verses: Verses;
  /** Verses where Tanzil and corpus word counts differ. */
  mismatches: Mismatch[];
  /** Consistency problems found by validateData. */
  errors: string[];
  /** Number of distinct words that carry a root. */
  rootWordCount: number;
  /** Where the English meanings came from (roots, lemmas, Quran words). */
  glossStats: ReturnType<typeof glossStats>;
}

/**
 * Builds the whole dataset from the raw text of the three sources and the cached Wiktionary
 * pages (for English meanings). Pure: no file or network access.
 */
export function buildDataset(
  morphText: string,
  arabicText: string,
  englishText: string,
  wiki: WikiCache = emptyCache(),
): Dataset {
  const morph = parseMorphology(morphText);
  const english = parseTanzil(englishText);
  const arabic = new Map<VerseKey, string>();
  for (const [key, text] of parseTanzil(arabicText)) arabic.set(key, stripBasmala(key, text));

  const verses: Verses = {};
  for (const [key, ar] of arabic) {
    const en = english.get(key);
    if (en === undefined) throw new Error(`No English text for verse ${key}`);
    verses[key] = { ar, en };
  }
  if (english.size !== arabic.size) {
    throw new Error(`English has ${english.size} verses, Arabic has ${arabic.size}`);
  }

  // Every word-count mismatch must be a known joined word, or the build stops.
  const mismatches = findMismatches(arabic, morph.verseWordCounts);
  checkJoinedWords(mismatches);

  const aggregate = aggregateRoots(morph.rootWords);
  const roots = aggregate.roots;
  // Store Tanzil word positions, so the app can split Verse.ar on spaces and highlight directly.
  const occurrences = aggregate.occurrences.map((list) =>
    list.map((o) => ({ v: o.v, w: o.w.map((n) => toTextPosition(o.v, n)) })),
  );
  // The layout keeps the raw-weight edges, so star positions do not move; galaxy.json gets the
  // links ranked by score (see buildEdges).
  const edges = buildEdges(occurrences, EDGES_PER_ROOT, Object.keys(verses).length);
  const glosses = buildGlosses({
    roots,
    wiki,
    rootTexts: occurrences.map((list) => list.map((o) => verses[o.v]!.en)),
    lemmaTexts: lemmaVerseTexts(roots, morph.rootWords, verses),
    allTexts: Object.values(verses).map((v) => v.en),
  });
  const layout = layoutGalaxy({ counts: roots.map((r) => r.count), edges: edges.layout });

  const galaxy: Galaxy = {
    version: 1,
    roots: roots.map((r) => ({
      id: r.id,
      ar: r.ar,
      tr: transliterateRoot(r.ar),
      en: glosses.roots[r.id]!,
      count: r.count,
      verseCount: r.verseCount,
      lemmas: r.lemmas.map((l, li) => ({ ...l, en: glosses.lemmas[r.id]![li]! })),
      pos: layout.positions[r.id]!,
      cluster: layout.clusters[r.id]!,
    })),
    edges: edges.links,
    clusterCount: layout.clusterCount,
  };

  return {
    galaxy,
    occurrences,
    verses,
    mismatches,
    errors: validateData(galaxy, occurrences, verses),
    rootWordCount: new Set(morph.rootWords.map((w) => `${w.verse}:${w.word}`)).size,
    glossStats: glossStats(roots, glosses),
  };
}

/** English texts of the verses of each lemma: result[rootId][lemmaIndex], in Quran order. */
function lemmaVerseTexts(roots: RootStats[], rootWords: RootWord[], verses: Verses): string[][][] {
  const index = new Map<string, number[]>(); // "root|lemma" -> [rootId, lemmaIndex]
  roots.forEach((r) => r.lemmas.forEach((l, li) => index.set(`${r.ar}|${l.ar}`, [r.id, li])));
  const keys = roots.map((r) => r.lemmas.map(() => new Set<VerseKey>()));
  for (const w of rootWords) {
    const [ri, li] = index.get(`${w.root}|${w.lemma}`)!;
    keys[ri!]![li!]!.add(w.verse);
  }
  return keys.map((ls) => ls.map((set) => [...set].map((v) => verses[v]!.en)));
}
