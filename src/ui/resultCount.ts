import type { SearchMode } from '../state/store';

/** Result count at the right end of the search field, e.g. `{ value: '8 of 22', unit: 'roots' }`. */
export interface ResultCount {
  value: string;
  unit: string;
}

/**
 * Text of the result count. Roots: "8 of 22 roots" while the list shows only the top roots.
 * Verses: the number, or "30+" when the list is `capped` (the real total is not known).
 * Null when there is nothing to count.
 */
export function resultCount({
  mode,
  shown,
  total,
  capped = false,
}: {
  mode: SearchMode;
  shown: number;
  total: number;
  capped?: boolean;
}): ResultCount | null {
  if (total <= 0) return null;
  const n = (x: number) => x.toLocaleString('en');
  const noun = mode === 'roots' ? 'root' : 'verse';
  const unit = total === 1 && !capped ? noun : `${noun}s`;
  if (capped) return { value: `${n(shown)}+`, unit };
  return { value: shown < total ? `${n(shown)} of ${n(total)}` : n(total), unit };
}
