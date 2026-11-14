import { arabicKey, arabicWords, isArabicQuery } from '../search/arabicKey';
import { SURAHS } from './surahs';

/** A surah found by name, with a score in 0..1 (higher first). */
export interface SurahMatch {
  /** 1-based surah number. */
  surah: number;
  score: number;
}

/** Most surah rows shown above the search results. */
export const SURAH_LIMIT = 3;
/** Shortest Latin query that matches the start of a name while the user types. */
const MIN_LATIN = 3;

// Articles before a name: "Al-", "An-", "Ash-", "Aal-i-" ... (only with a separator after them).
const ARTICLE = /^(aal|al|an|ar|as|ash|at|az|ad|adh|ath)[-\s']+(i[-\s]+)?/i;
// "surah 2", "sura al-kahf", "surat yasin".
const SURAH_WORD = /^(surah?|surat|soorah?)\s+(.+)$/i;

/**
 * Loose Latin key of a name or query: lowercase letters only, "oo" → u, "ee" → i,
 * doubled letters once, and a final "ah" → "a" ("Yaseen" and "ya sin" → "yasin").
 */
export function latinKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/(.)\1+/g, '$1')
    .replace(/([aiu])h$/, '$1');
}

/** English key: lowercase words without a leading "the". */
const englishKey = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the\b\s*/, '');

/** Arabic key of a name or query: the G18 key of each word, joined. */
const arKey = (text: string) => arabicWords(text).map(arabicKey).join('');

interface Keys {
  latin: string[];
  en: string;
  ar: string[];
}

/** Keys of every surah: the name with and without its article. */
const KEYS: Keys[] = SURAHS.map((s) => {
  const ar = arKey(s.ar);
  return {
    latin: [...new Set([latinKey(s.tr), latinKey(s.tr.replace(ARTICLE, ''))])],
    en: englishKey(s.en),
    // "ال" keys to "ل" (the alef is dropped): also match the name without it.
    ar: s.ar.startsWith('ال') ? [ar, ar.slice(1)] : [ar],
  };
});

/** Score of name keys for a query key: 1 equal, 0.8 a name starts with it (query of `min`+ letters), else 0. */
const nameScore = (keys: string[], q: string, min: number) =>
  !q ? 0 : keys.includes(q) ? 1 : q.length >= min && keys.some((k) => k.startsWith(q)) ? 0.8 : 0;

/** Score of an English name for a query: 0.9 equal, 0.6 a word of it starts with the query. */
function englishScore(en: string, q: string): number {
  if (!q) return 0;
  if (en === q) return 0.9;
  return q.length >= MIN_LATIN && (en.startsWith(q) || en.includes(` ${q}`)) ? 0.6 : 0;
}

/**
 * Surahs whose name matches a search: transliterated name (loose spelling, article optional),
 * English meaning, Arabic name (G18 key, "ال" optional), or "surah N". Best first, at most
 * `SURAH_LIMIT`. Verse keys and bare numbers match nothing.
 */
export function searchSurahs(query: string): SurahMatch[] {
  let q = query.trim();
  const named = SURAH_WORD.exec(q);
  if (named) {
    q = named[2]!.trim();
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      return n >= 1 && n <= SURAHS.length ? [{ surah: n, score: 1 }] : [];
    }
  }
  if (!/\p{L}/u.test(q)) return [];

  const found: SurahMatch[] = [];
  if (isArabicQuery(q)) {
    const key = arKey(q);
    KEYS.forEach((k, i) => {
      const score = nameScore(k.ar, key, 3);
      if (score) found.push({ surah: i + 1, score });
    });
  } else {
    const lat = latinKey(q.replace(ARTICLE, ''));
    const en = englishKey(q);
    KEYS.forEach((k, i) => {
      const score = Math.max(nameScore(k.latin, lat, MIN_LATIN), englishScore(k.en, en));
      if (score) found.push({ surah: i + 1, score });
    });
  }
  return found.sort((a, b) => b.score - a.score || a.surah - b.surah).slice(0, SURAH_LIMIT);
}
