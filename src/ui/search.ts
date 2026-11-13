import type { Root } from '../data/types';

// Harakat, small Quranic marks, superscript alef and tatweel: none change which root a word is.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
// All alef and hamza forms map to bare alef, so "اله", "أله" and "ءله" match the same root.
const HAMZA_ALEF = /[أإآٱٲٳءؤئ]/g;
const ARABIC_LETTER = /[؀-ۿ]/;

/** Normalizes Arabic for search: no diacritics or tatweel, one alef/hamza form, ى→ي. */
export function normalizeArabic(text: string): string {
  return text.replace(ARABIC_MARKS, '').replace(HAMZA_ALEF, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, '');
}

/** Normalizes a transliteration for search: lowercase, no diacritics, hyphens, ʾ/ʿ marks or spaces. */
export function normalizeLatin(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-\sʾʿʼʻ'`’‘]/g, '');
}

/** How well a root matches: 0 exact, 1 root prefix, 2 contains (root or lemma), null no match. */
function matchTier(root: Root, q: string, arabic: boolean): number | null {
  const names = arabic ? [normalizeArabic(root.ar)] : [normalizeLatin(root.tr)];
  const lemmas = arabic ? root.lemmas.map((l) => normalizeArabic(l.ar)) : [];
  if (names.includes(q) || lemmas.includes(q)) return 0;
  if (names.some((n) => n.startsWith(q))) return 1;
  if ([...names, ...lemmas].some((n) => n.includes(q))) return 2;
  return null;
}

/**
 * Finds roots by Arabic letters, transliteration or Arabic lemma.
 * Exact matches come first, then prefix, then substring; ties sort by word count.
 */
export function searchRoots(roots: Root[], query: string, limit = 8): Root[] {
  const arabic = ARABIC_LETTER.test(query);
  const q = arabic ? normalizeArabic(query) : normalizeLatin(query);
  if (!q) return [];
  const hits: { root: Root; tier: number }[] = [];
  for (const root of roots) {
    const tier = matchTier(root, q, arabic);
    if (tier !== null) hits.push({ root, tier });
  }
  hits.sort((a, b) => a.tier - b.tier || b.root.count - a.root.count);
  return hits.slice(0, limit).map((h) => h.root);
}
