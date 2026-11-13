import { useEffect, useState } from 'react';
import { loadVerses } from '../data/load';
import type { Verses } from '../data/types';

/** Loads verses.json (shared, cached) once `enabled` turns true; null until loaded or on error. */
export function useVerseTexts(enabled: boolean): Verses | null {
  const [verses, setVerses] = useState<Verses | null>(null);
  useEffect(() => {
    if (!enabled || verses) return;
    let active = true;
    loadVerses().then(
      (v) => active && setVerses(v),
      () => {}, // Snippets are optional; the result still shows the verse keys.
    );
    return () => {
      active = false;
    };
  }, [enabled, verses]);
  return verses;
}
