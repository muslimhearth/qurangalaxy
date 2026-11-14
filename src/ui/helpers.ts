import type { Galaxy, Root } from '../data/types';

/** A connected root, the number of verses it shares with the selected root, and the link score. */
export interface Neighbor {
  root: Root;
  weight: number;
  score: number;
}

/** Roots linked to `id` by `galaxy.edges`, highest link score first (ties: higher word count). */
export function neighbors(galaxy: Galaxy, id: number): Neighbor[] {
  const result: Neighbor[] = [];
  for (const e of galaxy.edges) {
    const other = e.source === id ? e.target : e.target === id ? e.source : null;
    const root = other === null ? undefined : galaxy.roots[other];
    if (root) result.push({ root, weight: e.weight, score: e.score });
  }
  return result.sort((a, b) => b.score - a.score || b.root.count - a.root.count);
}

/**
 * One word of a verse; `hit` is true when the word is built from the selected root,
 * `alt` when it is built from a second root (shared-verse view).
 */
export interface VerseWord {
  text: string;
  hit: boolean;
  alt?: boolean;
}

/**
 * Splits verse text on single spaces and marks the 1-based word positions in `hits`
 * (and in `alt`, when given).
 */
export function verseWords(ar: string, hits: number[], alt: number[] = []): VerseWord[] {
  const set = new Set(hits);
  const altSet = new Set(alt);
  return ar.split(' ').map((text, i) => {
    const word: VerseWord = { text, hit: set.has(i + 1) };
    if (altSet.has(i + 1)) word.alt = true;
    return word;
  });
}

const HASH_PREFIX = '#/root/';

/** URL hash for a root, e.g. "#/root/%D8%B1%D8%AD%D9%85" for رحم. */
export function hashForRoot(root: Root): string {
  return HASH_PREFIX + encodeURIComponent(root.ar);
}

/** Root id named by a "#/root/<arabic>" hash, or null when the hash names no known root. */
export function parseRootHash(hash: string, roots: Root[]): number | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  let ar: string;
  try {
    ar = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  } catch {
    return null; // Malformed percent-encoding.
  }
  return roots.find((r) => r.ar === ar)?.id ?? null;
}
