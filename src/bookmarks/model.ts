import type { TabTarget } from '../tabs/target';
import { isVerseKey } from '../verses/verseKey';

/** A saved root or verse, with the time it was saved (ms since epoch). */
export type Bookmark = TabTarget & { at: number };

/** Most bookmarks kept; the oldest go first. High enough to never matter in normal use. */
export const BOOKMARKS_MAX = 1000;

/** True when two targets name the same root or the same verse. */
export function sameTarget(a: TabTarget, b: TabTarget): boolean {
  if ('root' in a) return 'root' in b && a.root === b.root;
  return 'verse' in b && a.verse === b.verse;
}

/** Only the target fields, so a bookmark never carries extra keys. */
const bare = (t: TabTarget): TabTarget => ('root' in t ? { root: t.root } : { verse: t.verse });

/** True when the target is bookmarked. */
export function hasBookmark(list: readonly Bookmark[], t: TabTarget): boolean {
  return list.some((b) => sameTarget(b, t));
}

/** The list without the target. */
export function removeBookmark(list: readonly Bookmark[], t: TabTarget): Bookmark[] {
  return list.filter((b) => !sameTarget(b, t));
}

/** Removes the target when it is bookmarked, else adds it at the top (newest first). */
export function toggleBookmark(list: readonly Bookmark[], t: TabTarget, now = Date.now()): Bookmark[] {
  if (hasBookmark(list, t)) return removeBookmark(list, t);
  return [{ ...bare(t), at: now }, ...list].slice(0, BOOKMARKS_MAX);
}

/** Checks one stored entry. A missing or broken time becomes 0 (oldest). */
function readOne(raw: unknown): Bookmark | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0;
  if (typeof r.root === 'number' && Number.isInteger(r.root) && r.root >= 0) return { root: r.root, at };
  if (typeof r.verse === 'string' && isVerseKey(r.verse)) return { verse: r.verse, at };
  return null;
}

/** Reads stored bookmarks: keeps valid entries, drops repeats, sorts newest first, caps the length. */
export function readBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  const out: Bookmark[] = [];
  for (const b of raw.map(readOne)) {
    if (!b) continue;
    const i = out.findIndex((x) => sameTarget(x, b));
    if (i < 0) out.push(b);
    else if (b.at > out[i]!.at) out[i] = b;
  }
  return out.sort((a, b) => b.at - a.at).slice(0, BOOKMARKS_MAX);
}
