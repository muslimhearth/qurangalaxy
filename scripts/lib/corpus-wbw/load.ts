/**
 * Integration hook for the corpus word-by-word glosses.
 *
 * Not wired into the data build. Once the corpus team allows reuse, main can call
 * `loadCorpusGlosses()` in `scripts/build-data.ts` and use its maps as the top gloss source:
 *
 *   const corpus = loadCorpusGlosses();
 *   const glosses = corpus?.lemmas.get(lemma.ar) ?? otherSource(lemma);
 *
 * Until then the file is LOCAL EVALUATION ONLY and must not reach `public/data/`.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { GlossAggregate } from './aggregate';

/** Default location of the aggregated glosses (gitignored). */
export const CORPUS_GLOSSES_PATH = 'data/derived/corpus-glosses.json';

/** Shape of `data/derived/corpus-glosses.json`. */
export interface CorpusGlossFile extends GlossAggregate {
  meta: { source: string; licence: string; generated: string; topN: number };
}

/** Gloss lists keyed by lemma and by root (Arabic script, as in the corpus `LEM:` / `ROOT:`). */
export interface CorpusGlossMaps {
  /** Lemma → normalized glosses, most frequent first. */
  lemmas: Map<string, string[]>;
  /** Root → normalized glosses across its lemmas, most frequent first. */
  roots: Map<string, string[]>;
}

/** Converts the parsed JSON file to gloss maps, keeping at most `limit` glosses per key. */
export function toGlossMaps(file: CorpusGlossFile, limit = Infinity): CorpusGlossMaps {
  const pick = (glosses: { gloss: string }[]) => glosses.slice(0, limit).map((g) => g.gloss);
  return {
    lemmas: new Map(Object.entries(file.lemmas).map(([k, v]) => [k, pick(v.glosses)])),
    roots: new Map(Object.entries(file.roots).map(([k, v]) => [k, pick(v.glosses)])),
  };
}

/**
 * Loads the aggregated corpus glosses. Returns undefined when the file does not exist,
 * so a caller can fall back to another source.
 */
export function loadCorpusGlosses(path = CORPUS_GLOSSES_PATH, limit = Infinity): CorpusGlossMaps | undefined {
  if (!existsSync(path)) return undefined;
  return toGlossMaps(JSON.parse(readFileSync(path, 'utf8')) as CorpusGlossFile, limit);
}
