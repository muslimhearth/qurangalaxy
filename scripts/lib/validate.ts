import type { Galaxy, Occurrences, VerseKey, Verses } from '../../src/data/types';

/**
 * Checks that the three output files agree with each other.
 * Returns a list of problems; an empty list means the data is consistent.
 */
export function validateData(galaxy: Galaxy, occurrences: Occurrences, verses: Verses): string[] {
  const errors: string[] = [];
  const n = galaxy.roots.length;

  galaxy.roots.forEach((r, i) => {
    if (r.id !== i) errors.push(`root ${i} has id ${r.id}`);
    if (!Number.isInteger(r.cluster) || r.cluster < 0 || r.cluster >= galaxy.clusterCount) {
      errors.push(`root ${i} has cluster ${r.cluster}`);
    }
  });

  if (occurrences.length !== n) errors.push(`occurrences has ${occurrences.length} lists for ${n} roots`);
  occurrences.forEach((list, id) => {
    for (const { v, w } of list) {
      const verse = verses[v as VerseKey];
      if (!verse) {
        errors.push(`root ${id}: verse ${v} not in verses`);
        continue;
      }
      const wordCount = verse.ar.split(' ').length;
      for (const pos of w) {
        if (pos < 1 || pos > wordCount) {
          errors.push(`root ${id}: word ${pos} out of range in ${v} (${wordCount} words)`);
        }
      }
    }
  });

  galaxy.edges.forEach((e, i) => {
    const valid = (x: number) => Number.isInteger(x) && x >= 0 && x < n;
    if (!valid(e.source) || !valid(e.target) || e.source >= e.target) {
      errors.push(`edge ${i}: bad ids ${e.source}-${e.target}`);
    }
  });
  return errors;
}
