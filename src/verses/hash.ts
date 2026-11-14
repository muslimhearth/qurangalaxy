/** URL hash for an open verse: "#/verse/3:109". */
import type { VerseKey } from '../data/types';
import { isVerseKey } from './verseKey';

const PREFIX = '#/verse/';

/** URL hash that opens verse `key`. */
export function hashForVerse(key: VerseKey): string {
  return PREFIX + key;
}

/** Verse named by a "#/verse/s:v" hash, or null when the hash names no verse. */
export function parseVerseHash(hash: string): VerseKey | null {
  if (!hash.startsWith(PREFIX)) return null;
  let key: string;
  try {
    key = decodeURIComponent(hash.slice(PREFIX.length));
  } catch {
    return null; // Malformed percent-encoding.
  }
  return isVerseKey(key) ? key : null;
}
