import type { Occurrences, VerseKey, Verses } from '../../src/data/types';
import { exactForms, type WordFormIndex } from '../../src/search/wordForms';

/** How well typed plain-Arabic words find their roots in the word-form index. */
export interface Coverage {
  /** Root words checked (verses whose typed text has the same word count). */
  tokens: number;
  /** Root words in verses whose word counts differ (not checked). */
  skipped: number;
  /** Typed form's most frequent root is the word's root. */
  top1: number;
  /** Typed form's roots include the word's root. */
  found: number;
  /** Typed forms that missed, with their Uthmani spelling, most frequent first. */
  misses: { typed: string; uthmani: string; n: number }[];
}

/**
 * Looks up the typed (plain) form of every root word: `typed` holds the same verses in a plain
 * spelling (e.g. Tanzil Simple Clean), word for word.
 */
export function wordFormCoverage(
  index: WordFormIndex,
  verses: Verses,
  occurrences: Occurrences,
  typed: Map<VerseKey, string>,
): Coverage {
  const c: Coverage = { tokens: 0, skipped: 0, top1: 0, found: 0, misses: [] };
  const misses = new Map<string, Coverage['misses'][number]>();
  occurrences.forEach((list, id) => {
    for (const { v, w } of list) {
      const uthmani = verses[v]!.ar.split(' ');
      const plain = typed.get(v)?.trim().split(/\s+/) ?? [];
      if (plain.length !== uthmani.length) {
        c.skipped += w.length;
        continue;
      }
      for (const pos of w) {
        c.tokens++;
        const hits = exactForms(index, plain[pos - 1]!);
        if (hits[0]?.id === id) c.top1++;
        if (hits.some((h) => h.id === id)) c.found++;
        else {
          const k = `${plain[pos - 1]} ${uthmani[pos - 1]}`;
          const m = misses.get(k) ?? { typed: plain[pos - 1]!, uthmani: uthmani[pos - 1]!, n: 0 };
          m.n++;
          misses.set(k, m);
        }
      }
    }
  });
  c.misses = [...misses.values()].sort((a, b) => b.n - a.n);
  return c;
}
