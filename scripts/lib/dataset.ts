import type { Galaxy, Occurrences, VerseKey, Verses } from '../../src/data/types';
import { aggregateRoots } from './aggregate';
import { findMismatches, type Mismatch } from './align';
import { cooccurrenceEdges } from './edges';
import { layoutGalaxy } from './layout';
import { parseMorphology } from './morphology';
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
}

/** Builds the whole dataset from the raw text of the three sources. Pure: no file or network access. */
export function buildDataset(morphText: string, arabicText: string, englishText: string): Dataset {
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
  const edges = cooccurrenceEdges(occurrences, EDGES_PER_ROOT);
  const layout = layoutGalaxy({ counts: roots.map((r) => r.count), edges });

  const galaxy: Galaxy = {
    version: 1,
    roots: roots.map((r) => ({
      id: r.id,
      ar: r.ar,
      tr: transliterateRoot(r.ar),
      count: r.count,
      verseCount: r.verseCount,
      lemmas: r.lemmas,
      pos: layout.positions[r.id]!,
      cluster: layout.clusters[r.id]!,
    })),
    edges,
    clusterCount: layout.clusterCount,
  };

  return {
    galaxy,
    occurrences,
    verses,
    mismatches,
    errors: validateData(galaxy, occurrences, verses),
    rootWordCount: new Set(morph.rootWords.map((w) => `${w.verse}:${w.word}`)).size,
  };
}
