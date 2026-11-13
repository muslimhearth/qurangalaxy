/**
 * Low-level wikitext helpers: templates, links and sense lines to short English phrases.
 */

/** A parsed template call: `{{name|a|b|k=v}}`. */
export interface Template {
  name: string;
  positional: string[];
  named: Record<string, string>;
}

/** A sense that only points to another word, e.g. "plural of X". */
export interface FormOf {
  /** Kind without "ar-" and " of", e.g. "plural", "verbal noun", "alt form". */
  kind: string;
  /** The vocalized target word. */
  target: string;
}

/** Result of reading one `# ...` sense line. */
export interface GlossLine {
  phrases: string[];
  formOf?: FormOf;
  /** True for senses outside Classical/Quranic use (dialect, colloquial, modern...). */
  skip?: boolean;
}

/** Most phrase words kept; longer phrases are explanations, not glosses. */
export const MAX_WORDS = 4;

const ARABIC = /[؀-ۿ]/;
// Labels that mark a sense as not Classical Arabic.
const SKIP_LABEL =
  /colloquial|dialect|egypt|gulf|levant|iraq|morocc|tunis|algeri|hijaz|najd|sudan|neolog|slang|internet|vulgar|informal|computing|modern|chiefly in/i;
// Phrases that are notes, not meanings: "etc", "cf. Hebrew", "forms the past perfect",
// "in reduplication", or a fragment ending in a preposition ("one possessed of").
const NOT_A_GLOSS = /^(?:etc|cf\b|forms? |used |see |in |as |also )|\b(?:of|with|to|for|from|by|in|on|at|etc)$/i;
const FORM_OF_PLAIN =new Set(['alt form', 'alt sp', 'alt spelling', 'alternative form', 'alternative spelling', 'alt-form']);
// Templates whose first argument is shown as text.
const TEXT_ARG1 = new Set(['non-gloss', 'n-g', 'ng', 'ngd', 'non-gloss definition', 'taxlink', 'taxfmt', 'vern', 'smallcaps', 'lang']);
const LINK = new Set(['l', 'm', 'l-lite', 'll', 'link', 'mention', 'm-lite']);

/** Splits `inner` (template text without braces) on top-level "|", respecting nested {{ }} and [[ ]]. */
function splitArgs(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      cur += two;
      i++;
    } else if ((two === '}}' || two === ']]') && depth > 0) {
      depth--;
      cur += two;
      i++;
    } else if (inner[i] === '|' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += inner[i];
  }
  out.push(cur);
  return out;
}

/** Parses the inside of a template call (without the outer braces). */
export function parseTemplate(inner: string): Template {
  const [name = '', ...args] = splitArgs(inner);
  const t: Template = { name: name.trim(), positional: [], named: {} };
  for (const a of args) {
    const m = /^\s*([\w -]+?)\s*=([\s\S]*)$/.exec(a);
    if (m) t.named[m[1]!] = m[2]!.trim();
    else t.positional.push(a.trim());
  }
  return t;
}

/** Calls `fn` on each template, innermost first, and puts its result in place. */
export function replaceTemplates(text: string, fn: (t: Template) => string): string {
  const innermost = /\{\{((?:(?!\{\{|\}\}).)*)\}\}/s;
  let out = text;
  for (let m = innermost.exec(out); m; m = innermost.exec(out)) {
    out = out.slice(0, m.index) + fn(parseTemplate(m[1]!)) + out.slice(m.index + m[0].length);
  }
  return out;
}

/** Turns `[[target|text]]` and `[[target]]` into their text. */
export function unlink(text: string): string {
  return text.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
}

/** Form-of target of a template, or undefined for other templates. */
export function formOfTemplate(t: Template): FormOf | undefined {
  const name = t.name.toLowerCase();
  if (!name.endsWith(' of') && !FORM_OF_PLAIN.has(name)) return undefined;
  // "ar-verbal noun of|X" has no language argument; "plural of|ar|X" does.
  const target = name.startsWith('ar-') ? t.positional[0] : t.positional[1];
  if (!target || !ARABIC.test(target)) return undefined;
  return { kind: name.replace(/^ar-/, '').replace(/ of$/, ''), target };
}

/** Text a template shows inside a gloss; most templates (labels, notes) show nothing. */
function templateText(t: Template): string {
  const name = t.name.toLowerCase();
  if (name === 'nbsp' || name === 'sp') return ' ';
  if (name === ',') return ',';
  if (name === 'w' || name === 'wp') return t.positional[1] ?? t.positional[0] ?? '';
  if (TEXT_ARG1.has(name)) return t.positional[name === 'lang' ? 1 : 0] ?? '';
  if (LINK.has(name) && t.positional[0] === 'en') return t.positional[2] || t.positional[1] || '';
  return '';
}

/** Removes nested parentheses blocks such as "(day of)". */
function dropParens(text: string): string {
  let out = text;
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/\([^()]*\)/g, '');
  }
  return out;
}

/** Converts wikitext to plain text: links to text, glossing templates to text, markup removed. */
export function plainText(wikitext: string): string {
  let s = wikitext.replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<!--[\s\S]*?-->/g, '');
  s = replaceTemplates(unlink(s), templateText);
  s = s.replace(/<[^>]+>/g, '').replace(/'{2,}/g, '');
  return dropParens(s).replace(/\s+/g, ' ').replace(/\s+([,;.])/g, '$1').trim();
}

/**
 * Splits plain text into short phrases: on "," and ";", without leading articles or
 * trailing dots, lowercased unless every word is capitalized or `proper` is set.
 */
export function splitPhrases(text: string, proper = false): string[] {
  const out: string[] = [];
  for (const [i, raw] of text.split(/[;,:/]/).entries()) {
    let p = raw.trim().replace(/[.:!]+$/, '').replace(/^(?:a|an|the)\s+/i, '').trim();
    if (!p || ARABIC.test(p) || /[{}[\]=|…!?]/.test(p) || NOT_A_GLOSS.test(p)) continue;
    // Later phrases are often explanations; keep them only when shorter.
    if (p.split(/\s+/).length > (i === 0 ? MAX_WORDS : MAX_WORDS - 1)) continue;
    const words = p.split(/\s+/);
    const allCapitalized = words.length > 1 && words.every((w) => /^[A-Z]/.test(w) || /^(of|the|and)$/.test(w));
    if (!proper && !allCapitalized) p = p[0]!.toLowerCase() + p.slice(1);
    out.push(p);
  }
  return out;
}

/** Labels from `{{lb|ar|...}}` style templates in a line. */
function labels(line: string): string[] {
  const out: string[] = [];
  replaceTemplates(line, (t) => {
    if (/^(lb|lbl|label|q|qual|qualifier|i)$/.test(t.name)) out.push(...t.positional);
    return '';
  });
  return out;
}

/** Reads one sense line ("# ...") into phrases, a form-of target, or a skip flag. */
export function parseGlossLine(line: string, proper = false): GlossLine {
  const body = line.replace(/^#+\s*/, '');
  if (labels(body).some((l) => SKIP_LABEL.test(l))) return { phrases: [], skip: true };
  let formOf: FormOf | undefined;
  replaceTemplates(body, (t) => {
    formOf ??= formOfTemplate(t);
    return '';
  });
  if (formOf) return { phrases: [], formOf };
  return { phrases: splitPhrases(plainText(body), proper) };
}

/** Inner texts of the top-level templates in `text`, in order (nested ones stay inside). */
export function topTemplates(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length - 1; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{') {
      if (depth++ === 0) start = i + 2;
      i++;
    } else if (two === '}}' && depth > 0) {
      if (--depth === 0) out.push(text.slice(start, i));
      i++;
    }
  }
  return out;
}

/** Joins lines so that a template spread over several lines becomes one logical line. */
export function logicalLines(text: string): string[] {
  const out: string[] = [];
  let open = 0;
  for (const line of text.split('\n')) {
    if (open > 0) out[out.length - 1] += `\n${line}`;
    else out.push(line);
    open = Math.max(0, open + (line.match(/\{\{/g)?.length ?? 0) - (line.match(/\}\}/g)?.length ?? 0));
  }
  return out;
}

/** The `==Arabic==` level-2 section of a page, or "" when there is none. */
export function arabicSection(page: string): string {
  const start = page.search(/^==\s*Arabic\s*==\s*$/m);
  if (start < 0) return '';
  const rest = page.slice(start);
  const next = rest.slice(2).search(/^==[^=]/m);
  return next < 0 ? rest : rest.slice(0, next + 2);
}
