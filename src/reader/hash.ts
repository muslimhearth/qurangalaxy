/** URL hash for the surah reader: "#/surah/2/17". */
import type { ReaderPlace } from '../state/store';
import { isPlace } from './surahs';

const PREFIX = '#/surah/';

/** URL hash that opens the reader at `place`. */
export function hashForReader(place: ReaderPlace): string {
  return `${PREFIX}${place.surah}/${place.verse}`;
}

/** Place named by a "#/surah/s/v" (or "#/surah/s") hash, or null when it names no verse. */
export function parseReaderHash(hash: string): ReaderPlace | null {
  if (!hash.startsWith(PREFIX)) return null;
  const m = /^(\d{1,3})(?:\/(\d{1,3}))?$/.exec(hash.slice(PREFIX.length));
  if (!m) return null;
  const place = { surah: Number(m[1]), verse: m[2] ? Number(m[2]) : 1 };
  return isPlace(place) ? place : null;
}
