/** One word of a corpus word-by-word page. */
export interface WbwWord {
  /** Corpus word location `chapter:verse:word`, e.g. `2:255:1`. */
  location: string;
  /** Latin transliteration shown above the gloss. */
  translit: string;
  /** English gloss exactly as shown (helper words and punctuation kept). */
  gloss: string;
}

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rarr: '→',
  larr: '←',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
};

/** Decodes the HTML entities that occur on corpus pages. Unknown names stay as they are. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
    return NAMED[code.toLowerCase()] ?? all;
  });
}

/** Turns an HTML fragment into plain text: no tags, entities decoded, spaces collapsed. */
function toText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns only the word table (`<table class="morphologyTable">…</table>`) of a page,
 * or undefined if the page has none. The cache stores this excerpt instead of the full page.
 */
export function extractTable(html: string): string | undefined {
  const match = /<table class="morphologyTable"[\s\S]*?<\/table>/.exec(html);
  return match?.[0];
}

/**
 * Parses a corpus `wordbyword.jsp` page (or its word table) into words in page order.
 * The first cell of each row holds: location, `<br/>`, transliteration, `<br/>`, gloss.
 */
export function parseWordByWordPage(html: string): WbwWord[] {
  const words: WbwWord[] = [];
  const cell = /<span class="location">\((\d+:\d+:\d+)\)<\/span>([\s\S]*?)<\/td>/g;
  for (const match of html.matchAll(cell)) {
    // parts[0] is the empty text between the location span and the first <br/>.
    const parts = (match[2] ?? '').split(/<br\s*\/?>/i);
    words.push({
      location: match[1]!,
      translit: toText(parts[1] ?? ''),
      // A gloss could itself contain a <br/>; join the rest so nothing is lost.
      gloss: toText(parts.slice(2).join(' ')),
    });
  }
  return words;
}
