import type { Occurrence } from '../data/types';
import { TOTAL_VERSES, verseIndex } from './surahs';

/** Verse state: uses neither root. */
export const LIT_NONE = 0;
/** Verse state: uses the selected root (A) only. */
export const LIT_A = 1;
/** Verse state: uses the compare root (B) only. */
export const LIT_B = 2;
/** Verse state: uses both roots. */
export const LIT_BOTH = 3;

/** One state per verse in Mushaf order: `LIT_NONE`, `LIT_A`, `LIT_B` or `LIT_BOTH` (a bit mask). */
export type LitStates = Uint8Array;

/** Per-verse states from the occurrences of root A and (optional) compare root B. */
export function litStates(a: readonly Occurrence[] | undefined, b: readonly Occurrence[] | undefined): LitStates {
  const lit = new Uint8Array(TOTAL_VERSES);
  const mark = (list: readonly Occurrence[] | undefined, bit: number) => {
    for (const o of list ?? []) {
      const i = verseIndex(o.v);
      if (i >= 0) lit[i] = lit[i]! | bit;
    }
  };
  mark(a, LIT_A);
  mark(b, LIT_B);
  return lit;
}
