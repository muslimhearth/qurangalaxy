/**
 * Fallback meanings from the Saheeh International translation: the English words that are
 * much more frequent in a root's (or lemma's) verses than in the whole Quran (TF-IDF style).
 */

/** Function words and words common to the whole translation; they never name a meaning. */
const STOP = new Set(
  `a about above after again against all also am among an and any are as at be because been before being
  between both but by can could did do does done down during e each even every except few for from g had
  has have having he her here hers him himself his how i ie if in indeed into is it its itself just let like
  may me might more most must my no nor not now o of on once one ones only or other our ours ourselves out
  over own said same say says shall she should so some such than that the their theirs them themselves then
  there therein thereof these they this those through thus to too under until unto up upon us very was we
  were what whatever when where whereas whether which while who whoever whom whose why will with within
  without would ye yet you your yours yourself yourselves allah lord certainly surely verily truly`.split(/\s+/),
);

/** Most fallback meanings per root or lemma. */
export const MAX_FALLBACK = 3;
/** A word must be this many times more frequent in the verses than overall. */
const MIN_LIFT = 3;

/** Lowercase content words of an English text: no punctuation, possessive 's or stop words. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Simple plural stemming: ships→ship, skies→sky, glasses→glass; leaves grass, us, is. */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Number of texts each stem appears in. */
export function documentFrequencies(texts: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const t of texts) for (const s of new Set(tokenize(t).map(stem))) df.set(s, (df.get(s) ?? 0) + 1);
  return df;
}

/**
 * Up to MAX_FALLBACK words that stand out in `texts` against a corpus of `total` texts with
 * document frequencies `df`, found in at least `minShare` of the texts.
 * Score = share of texts with the word × log(total / df).
 */
export function distinctiveWords(texts: string[], df: Map<string, number>, total: number, minShare = 0): string[] {
  const n = texts.length;
  if (n === 0) return [];
  const inTexts = new Map<string, number>();
  const surface = new Map<string, Map<string, number>>();
  for (const t of texts) {
    const words = tokenize(t);
    for (const w of words) {
      const forms = surface.get(stem(w)) ?? new Map<string, number>();
      forms.set(w, (forms.get(w) ?? 0) + 1);
      surface.set(stem(w), forms);
    }
    for (const s of new Set(words.map(stem))) inTexts.set(s, (inTexts.get(s) ?? 0) + 1);
  }
  const scored: { s: string; score: number }[] = [];
  for (const [s, a] of inTexts) {
    const d = df.get(s) ?? a;
    // One verse cannot show a pattern; with more, the word must recur.
    if (a < Math.min(2, n) || a / n < minShare) continue;
    if (a / n / (d / total) < MIN_LIFT) continue;
    scored.push({ s, score: (a / n) * Math.log(total / d) });
  }
  scored.sort((x, y) => y.score - x.score || (x.s < y.s ? -1 : 1));
  const top = scored[0]?.score ?? 0;
  return scored
    .filter((x) => x.score >= top / 2)
    .slice(0, MAX_FALLBACK)
    .map((x) => [...surface.get(x.s)!].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))[0]![0]);
}
