import type { VerseKey } from '../data/types';
import type { ReaderPlace } from '../state/store';
import data from './surahs.json';

/** One surah's names and size (Tanzil Quran Metadata, see public/data/NOTICE.txt). */
export interface Surah {
  /** Arabic name, e.g. "البقرة". */
  ar: string;
  /** Transliterated name, e.g. "Al-Baqara". */
  tr: string;
  /** English name, e.g. "The Cow". */
  en: string;
  /** Number of verses. */
  verses: number;
}

/** All 114 surahs; index 0 is surah 1. Built by `pnpm data:reader`. */
export const SURAHS: readonly Surah[] = data;

/** The surah with 1-based number `n`, or undefined. */
export const surahAt = (n: number): Surah | undefined => SURAHS[n - 1];

/** Verse keys of surah `n` in order; empty for an unknown surah. */
export function surahVerseKeys(n: number): VerseKey[] {
  const count = surahAt(n)?.verses ?? 0;
  return Array.from({ length: count }, (_, i) => `${n}:${i + 1}` as VerseKey);
}

/** The reader place of a verse key ("2:17" → surah 2, verse 17). */
export function placeOf(key: VerseKey): ReaderPlace {
  const [surah, verse] = key.split(':').map(Number);
  return { surah: surah!, verse: verse! };
}

/** True when the place names a real verse. */
export function isPlace(p: ReaderPlace): boolean {
  const s = surahAt(p.surah);
  return Number.isInteger(p.surah) && Number.isInteger(p.verse) && !!s && p.verse >= 1 && p.verse <= s.verses;
}

/** True when two places are the same (both null counts as the same). */
export function samePlace(a: ReaderPlace | null, b: ReaderPlace | null): boolean {
  return a === b || (!!a && !!b && a.surah === b.surah && a.verse === b.verse);
}

/** Short label for a place, e.g. "Al-Baqara 2:17" (tabs, titles). */
export function readerLabel(p: ReaderPlace): string {
  return `${surahAt(p.surah)?.tr ?? 'Surah'} ${p.surah}:${p.verse}`;
}
