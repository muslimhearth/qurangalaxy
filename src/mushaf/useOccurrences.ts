import { useEffect, useState } from 'react';
import type { Occurrences } from '../data/types';
import { loadOccurrences } from '../data/load';

/**
 * occurrences.json once `needed` is true (it loads lazily and is shared with the root panel),
 * else null. A failed load also gives null: the mosaic then just stays dim.
 */
export function useOccurrences(needed: boolean): Occurrences | null {
  const [data, setData] = useState<Occurrences | null>(null);

  useEffect(() => {
    if (!needed || data) return;
    let active = true;
    loadOccurrences().then(
      (occ) => active && setData(occ),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [needed, data]);

  return data;
}
