import type { Galaxy, Root } from '../data/types';

/** A connected root and the number of verses it shares with the selected root. */
export interface Neighbor {
  root: Root;
  weight: number;
}

/** Roots linked to `id` by `galaxy.edges`, strongest link first (ties: higher word count). */
export function neighbors(galaxy: Galaxy, id: number): Neighbor[] {
  const result: Neighbor[] = [];
  for (const e of galaxy.edges) {
    const other = e.source === id ? e.target : e.target === id ? e.source : null;
    const root = other === null ? undefined : galaxy.roots[other];
    if (root) result.push({ root, weight: e.weight });
  }
  return result.sort((a, b) => b.weight - a.weight || b.root.count - a.root.count);
}

/** One word of a verse; `hit` is true when the word is built from the selected root. */
export interface VerseWord {
  text: string;
  hit: boolean;
}

/** Splits verse text on single spaces and marks the 1-based word positions in `hits`. */
export function verseWords(ar: string, hits: number[]): VerseWord[] {
  const set = new Set(hits);
  return ar.split(' ').map((text, i) => ({ text, hit: set.has(i + 1) }));
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
