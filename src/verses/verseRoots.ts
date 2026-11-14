/** Which roots a verse uses, from occurrences.json. */
import type { Occurrences, VerseKey } from '../data/types';

type Lookup = Map<VerseKey, { id: number; first: number }[]>;

const lookups = new WeakMap<Occurrences, Lookup>();

function build(occurrences: Occurrences): Lookup {
  const map: Lookup = new Map();
  occurrences.forEach((list, id) => {
    for (const { v, w } of list) {
      const entry = { id, first: Math.min(...w) };
      const roots = map.get(v);
      if (roots) roots.push(entry);
      else map.set(v, [entry]);
    }
  });
  return map;
}

/** Ids of the roots used in verse `key`, in the order their first word appears. */
export function rootsInVerse(occurrences: Occurrences, key: VerseKey): number[] {
  let lookup = lookups.get(occurrences);
  if (!lookup) lookups.set(occurrences, (lookup = build(occurrences)));
  return [...(lookup.get(key) ?? [])].sort((a, b) => a.first - b.first || a.id - b.id).map((r) => r.id);
}
