import type { MorphWord } from './morph-index';

/** Leading words that belong to prefixes or suffixes, not to the lemma. Always dropped. */
const LEADING = new Set(['and', 'so', 'then', 'but', 'or', 'the', 'a', 'an', 'his', 'her', 'its', 'their', 'your', 'our', 'my']);
/** Leading prepositions. Dropped only when the word has a prefixed preposition (bi, li, ka). */
const PREPOSITIONS = new Set(['by', 'with', 'for', 'to', 'in', 'of', 'from', 'on', 'like', 'as', 'at', 'upon', 'about']);
/** Trailing object pronouns. Dropped only when the word has a suffixed pronoun. */
const OBJECTS = new Set(['him', 'them', 'her', 'it', 'you', 'us', 'me']);

/** Removes brackets: glued parts are joined (`what(ever)`), standalone ones dropped. */
function dropBrackets(text: string): string {
  const joined = text.replace(/(\w)\(([^()]*)\)/g, '$1$2');
  const dropped = joined.replace(/\([^()]*\)|\[[^[\]]*\]/g, ' ');
  // A gloss that is only a helper word, e.g. "(is)", keeps that word.
  return dropped.trim() === '' ? joined.replace(/[()[\]]/g, ' ') : dropped;
}

/**
 * Normalizes a raw corpus gloss to a head form for its lemma, e.g. `(is) the Most High,` → `most high`.
 * Steps: drop helper words in brackets, trim punctuation and quotes, drop leading
 * conjunctions/articles/possessives (and prepositions or trailing object pronouns when the
 * morphology shows the matching prefix or suffix), lowercase except proper nouns and "Allah".
 * Never strips the gloss to nothing.
 */
export function normalizeGloss(raw: string, word: MorphWord): string {
  const cleaned = dropBrackets(raw)
    .replace(/["“”‘’]/g, ' ')
    .replace(/[.,;:!?–—-]+(\s|$)/g, ' ')
    .replace(/(^|\s)[-–—]+/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t !== '');
  const lower = (t: string) => t.toLowerCase();
  while (tokens.length > 1) {
    const first = lower(tokens[0]!);
    if (LEADING.has(first) || (word.prepPrefix && PREPOSITIONS.has(first))) tokens.shift();
    else break;
  }
  if (word.pronSuffix && tokens.length > 1 && OBJECTS.has(lower(tokens.at(-1)!))) tokens.pop();
  return tokens
    .map((t) => (word.properNoun || t.startsWith('Allah') ? t : lower(t)))
    .join(' ');
}
