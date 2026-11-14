/**
 * Which verses of a surah the reader has rendered: indexes `start` (inclusive) to `end`
 * (exclusive). The reader paints a small window around the open verse first, then grows it a
 * chunk per idle moment, so a long surah (286 verses) opens without a long freeze.
 */
export interface VerseWindow {
  start: number;
  end: number;
}

/** Verses rendered before the target in the first window. */
const BEFORE = 5;
/** Verses in the first window. */
const FIRST = 30;
/** Verses added on each side per step. */
export const CHUNK = 80;

/** First window for a surah of `count` verses opened at 0-based verse `target`. */
export function initialWindow(count: number, target: number): VerseWindow {
  const start = Math.max(0, Math.min(target - BEFORE, count - FIRST));
  return { start, end: Math.min(count, start + FIRST) };
}

/** The window one step larger on both sides, clamped to the surah. */
export function growWindow(w: VerseWindow, count: number): VerseWindow {
  return { start: Math.max(0, w.start - CHUNK), end: Math.min(count, w.end + CHUNK) };
}

/** True when the window holds every verse. */
export const isFull = (w: VerseWindow, count: number): boolean => w.start <= 0 && w.end >= count;
