/** Short verse snippets with the query words marked. */
import { normalizeWord, queryTerms, termScore, wordSpans, type VerseLang } from './terms';

/** A run of snippet text; `hit` marks a word that matches the query. */
export interface SnippetPart {
  text: string;
  hit: boolean;
}

/** Share of the snippet shown before the first hit, so the hit has some context. */
const LEAD = 0.25;

/**
 * Up to `max` characters of `text` (plus "…" at cut ends), cut at spaces, around the first
 * word that matches `query`; matching words have `hit: true`. With `typos`, near spellings match too.
 */
export function markedSnippet(
  text: string,
  query: string,
  lang: VerseLang,
  max: number,
  typos = false,
): SnippetPart[] {
  const terms = queryTerms(query, lang).filter((t) => t.weight > 0);
  const spans = wordSpans(text).filter(({ start, end }) => {
    const word = normalizeWord(text.slice(start, end), lang);
    return terms.some((t) => termScore(t.word, word, lang, typos) > 0);
  });

  // Window [from, to) of the text to show.
  let from = 0;
  let to = text.length;
  if (text.length > max) {
    const first = spans[0]?.start ?? 0;
    from = Math.max(0, Math.min(first - Math.round(max * LEAD), text.length - max));
    // Move the start forward to a word start, but never past the first hit.
    if (from > 0) {
      const space = text.indexOf(' ', from - 1);
      from = space >= 0 && space < first ? space + 1 : from;
    }
    to = Math.min(text.length, from + max);
    if (to < text.length) {
      const space = text.lastIndexOf(' ', to);
      if (space > from) to = space;
    }
  }

  const parts: SnippetPart[] = [];
  const add = (s: string, hit: boolean) => s && parts.push({ text: s, hit });
  if (from > 0) add('…', false);
  let pos = from;
  for (const { start, end } of spans) {
    if (end <= from || start >= to) continue;
    add(text.slice(pos, start), false);
    add(text.slice(start, end), true);
    pos = end;
  }
  add(text.slice(pos, to).replace(/[\s,;:]+$/, to < text.length ? '' : '$&'), false);
  if (to < text.length) add('…', false);
  return parts;
}
