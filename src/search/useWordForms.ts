import { useEffect, useState } from 'react';
import type { WordFormIndex } from './wordForms';
import { currentWordForms, loadWordForms } from './wordFormsLoad';

/**
 * Loads the word-form index (shared, cached) once `enabled` turns true; null until loaded or on
 * error. Search memos list the result as a dependency, so results refresh when it arrives.
 */
export function useWordForms(enabled: boolean): WordFormIndex | null {
  const [index, setIndex] = useState<WordFormIndex | null>(currentWordForms);
  useEffect(() => {
    if (!enabled || index) return;
    let active = true;
    loadWordForms().then(
      (i) => active && setIndex(i),
      () => {}, // Arabic search then works without word forms (root letters and lemmas only).
    );
    return () => {
      active = false;
    };
  }, [enabled, index]);
  return index;
}
