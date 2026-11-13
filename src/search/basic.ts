import { ARABIC_LETTER, normalizeArabic, normalizeLatin } from './normalize';
import { TIER, type Match, type Matcher } from './types';

/** Finds roots by Arabic root letters (exact, prefix, contains) or by an Arabic lemma (exact, contains). */
export const arabicMatcher: Matcher = (roots, query) => {
  if (!ARABIC_LETTER.test(query)) return [];
  const q = normalizeArabic(query);
  if (!q) return [];
  const out: Match[] = [];
  for (const root of roots) {
    const name = normalizeArabic(root.ar);
    let best: Match | null = null;
    const offer = (score: number, text: string) => {
      if (!best || score > best.score) best = { id: root.id, score, reason: { kind: 'arabic', text } };
    };
    if (name === q) offer(TIER.exact, root.ar);
    else if (name.startsWith(q)) offer(TIER.prefix, root.ar);
    else if (name.includes(q)) offer(TIER.contains, root.ar);
    for (const l of root.lemmas) {
      const lemma = normalizeArabic(l.ar);
      if (lemma === q) offer(TIER.exact, l.ar);
      else if (lemma.includes(q)) offer(TIER.contains, l.ar);
    }
    if (best) out.push(best);
  }
  return out;
};

/** Finds roots by their Latin root letters, e.g. "rhm" for r-ḥ-m (exact, prefix, contains). */
export const rootLetterMatcher: Matcher = (roots, query) => {
  if (ARABIC_LETTER.test(query)) return [];
  const q = normalizeLatin(query);
  if (!q) return [];
  const out: Match[] = [];
  for (const root of roots) {
    const name = normalizeLatin(root.tr);
    const score = name === q ? TIER.exact : name.startsWith(q) ? TIER.prefix : name.includes(q) ? TIER.contains : 0;
    if (score) out.push({ id: root.id, score, reason: { kind: 'latin', text: root.tr } });
  }
  return out;
};
