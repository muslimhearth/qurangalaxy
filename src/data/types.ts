/**
 * Shared data contract between the build pipeline (scripts/) and the app (src/).
 * The pipeline writes these shapes as JSON into public/data/; the app reads them.
 * Change this file only through the main session: every goal depends on it.
 */

/** A 3D position in scene units. */
export type Vec3 = [x: number, y: number, z: number];

/** One dictionary form (lemma) built from a root, e.g. رَحْمٰن from رحم. */
export interface Lemma {
  /** Lemma in Arabic script with diacritics, as given by the corpus. */
  ar: string;
  /** Number of words in the Quran with this lemma. */
  count: number;
}

/** One Arabic root: a star in the galaxy. */
export interface Root {
  /** Index of this root in `Galaxy.roots`. */
  id: number;
  /** Root letters in Arabic script, e.g. "رحم". */
  ar: string;
  /** Latin transliteration of the letters, e.g. "r-ḥ-m". */
  tr: string;
  /** Total number of words built from this root. Drives star size. */
  count: number;
  /** Number of distinct verses that contain this root. */
  verseCount: number;
  /** Lemmas of this root, sorted by count, highest first. */
  lemmas: Lemma[];
  /** Precomputed layout position. */
  pos: Vec3;
  /** Community (cluster) id from the layout step. Drives star color. */
  cluster: number;
}

/** Two roots that share verses. Undirected; `source < target`. */
export interface Edge {
  source: number;
  target: number;
  /** Number of verses that contain both roots. */
  weight: number;
}

/** Contents of public/data/galaxy.json. Loaded at startup. */
export interface Galaxy {
  version: 1;
  roots: Root[];
  /** Strongest co-occurrence links, pruned per root to keep the scene light. */
  edges: Edge[];
  /** Number of distinct clusters; cluster ids are 0..clusterCount-1. */
  clusterCount: number;
}

/** A verse key in "surah:ayah" form, e.g. "2:255". */
export type VerseKey = `${number}:${number}`;

/** Where a root occurs inside one verse. */
export interface Occurrence {
  /** The verse. */
  v: VerseKey;
  /** 1-based positions of the root's words in `Verse.ar` split on single spaces (Tanzil numbering). */
  w: number[];
}

/**
 * Contents of public/data/occurrences.json: index i holds the occurrences of root i,
 * in Quran order. Loaded lazily on first selection.
 */
export type Occurrences = Occurrence[][];

/** One verse ready for display. */
export interface Verse {
  /** Uthmani Arabic text (Tanzil), basmala prefix removed, words split by single spaces. */
  ar: string;
  /** English translation (Saheeh International via Tanzil). */
  en: string;
}

/** Contents of public/data/verses.json. Loaded lazily on first selection. */
export type Verses = Record<VerseKey, Verse>;
