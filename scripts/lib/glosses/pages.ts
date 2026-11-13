/**
 * Parses Wiktionary root appendix pages and Arabic lemma pages into glosses.
 */
import { englishStem } from '../../../src/search/english';
import { rootKey } from './arabic';
import {
  arabicSection,
  logicalLines,
  parseGlossLine,
  parseTemplate,
  plainText,
  splitPhrases,
  topTemplates,
  type FormOf,
} from './wikitext';

/** What a root appendix page says. */
export interface RootAppendix {
  /** Meanings of the root itself, e.g. ["light"]. */
  glosses: string[];
  /** Derived terms that carry a gloss (`t=`), vocalized. */
  derived: { word: string; glosses: string[] }[];
}

/** One part-of-speech entry of an Arabic lemma page. */
export interface WikiEntry {
  title: string;
  /** Root as a rootKey, or null when the page names none. */
  root: string | null;
  /** Vocalized headword. */
  head: string;
  pos: string;
  /** Short glosses, best first, deduplicated. */
  glosses: string[];
  /** Senses that only point to another word. */
  formOf: FormOf[];
}

const ARABIC = /[؀-ۿ]/;
// A whole argument in Arabic script (not a verb-form spec such as "I/i~a.vn:عِلْم").
const ARABIC_WORD = /^[؀-ۿ‌‍ ]+$/;
const SENSE = /^#(?![:*#])/;
const HEADER = /^(=+)\s*(.+?)\s*\1\s*$/;
const POS = new Set([
  'Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Particle', 'Pronoun', 'Proper noun',
  'Conjunction', 'Interjection', 'Numeral', 'Determiner', 'Participle', 'Phrase', 'Prepositional phrase',
]);
// "Related to X", "relating to X", "having to do with X": the head phrase carries no meaning.
const ROOT_PREFIX =
  /^(?:(?:forms? )?(?:terms? |words? )?(?:(?:related|relating|relate|pertaining|referring|relates)(?: to)?|having to do with|to do with|denoting|expressing|concerning|involving|meaning)\s+(?:the (?:concept|idea|notion|number)s?(?: of)?\s+)?)/i;

/** Key that treats "day"/"days", "sky"/"skies" and case variants as the same gloss. */
export function glossKey(gloss: string): string {
  return (gloss.toLowerCase().match(/[a-z]+/g) ?? []).map(englishStem).join(' ');
}

/** Removes duplicate glosses (by glossKey), keeping the first. */
export function dedupeGlosses(glosses: string[]): string[] {
  const seen = new Set<string>();
  return glosses.filter((g) => {
    const k = glossKey(g);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Reads the root meaning and the glossed derived terms of a root appendix page. */
export function parseRootAppendix(page: string): RootAppendix {
  const section = arabicSection(page) || page;
  const glosses: string[] = [];
  const derived: RootAppendix['derived'] = [];
  for (const line of logicalLines(section)) {
    if (SENSE.test(line)) {
      for (const part of plainText(line.replace(/^#\s*/, '')).split(/[,;/]|\s+(?:and|or)\s+/)) {
        const phrase = part.trim().replace(/^derivatively\s+/i, '').replace(ROOT_PREFIX, '');
        // Root meanings are headings: keep them shorter than lemma glosses.
        glosses.push(...splitPhrases(phrase).filter((p) => p.split(' ').length <= 3));
      }
    } else if (line.startsWith('*')) {
      for (const inner of topTemplates(line)) {
        const t = parseTemplate(inner);
        if (t.name !== 'l' || t.positional[0] !== 'ar') continue;
        const word = t.positional[2] || t.positional[1] || '';
        const gloss = splitPhrases(plainText(t.named.t ?? t.named.gloss ?? t.positional[3] ?? ''));
        if (ARABIC.test(word) && gloss.length > 0) derived.push({ word, glosses: dedupeGlosses(gloss) });
      }
    }
  }
  return { glosses: dedupeGlosses(glosses), derived };
}

/** Root letters named by a root template on the line, as a rootKey. */
function rootOf(line: string): string | null {
  for (const inner of topTemplates(line)) {
    const t = parseTemplate(inner);
    if (t.name === 'ar-rootbox' || t.name === 'ar-root') {
      const letters = t.positional.join('');
      if (ARABIC.test(letters)) return rootKey(letters);
    }
  }
  return null;
}

/** First Arabic argument of a headword or pronunciation template on the line. */
function arabicArg(line: string, names: RegExp): string | null {
  for (const inner of topTemplates(line)) {
    const t = parseTemplate(inner);
    if (!names.test(t.name)) continue;
    const arg = (t.named.head ?? t.positional.find((p) => ARABIC.test(p)))?.split(/[,،]/)[0]!.trim();
    if (arg && ARABIC_WORD.test(arg)) return arg;
  }
  return null;
}

/** Reads every Arabic part-of-speech entry of a lemma page. */
export function parseLemmaPage(title: string, page: string): WikiEntry[] {
  const entries: WikiEntry[] = [];
  let pageRoot: string | null = null; // root box before the first etymology header
  let etyRoot: string | null = null;
  let inEtymology = false;
  let etyEntries: WikiEntry[] = [];
  let pron: string | null = null;
  let current: WikiEntry | null = null;
  let senses: string[] = [];
  let needHead = false;

  const finish = () => {
    if (current) current.glosses = dedupeGlosses(senses);
    current = null;
    senses = [];
  };

  for (const line of logicalLines(arabicSection(page))) {
    const header = HEADER.exec(line);
    if (header) {
      const name = header[2]!;
      if (header[1]!.length <= 3 || /^Etymology/.test(name)) finish();
      if (/^Etymology/.test(name)) {
        inEtymology = true;
        etyRoot = null;
        etyEntries = [];
        pron = null;
      } else if (POS.has(name)) {
        finish();
        current = { title, root: etyRoot ?? pageRoot, head: pron ?? title, pos: name, glosses: [], formOf: [] };
        entries.push(current);
        etyEntries.push(current);
        needHead = true;
      } else if (current && header[1]!.length <= 4) {
        // A sibling section (Declension, Synonyms...) ends the senses but not the entry.
        needHead = false;
      }
      continue;
    }

    const root = rootOf(line);
    if (root) {
      if (inEtymology) {
        etyRoot = root;
        for (const e of etyEntries) e.root = root;
      } else pageRoot = root;
    }
    const p = arabicArg(line, /^ar-(pr|IPA)$/);
    if (p) pron = p;

    if (!current) continue;
    if (needHead && line.startsWith('{{')) {
      needHead = false;
      current.head = arabicArg(line, /^(ar-|head$)/) ?? pron ?? title;
    } else if (SENSE.test(line)) {
      const g = parseGlossLine(line, current.pos === 'Proper noun');
      if (g.formOf) current.formOf.push(g.formOf);
      senses.push(...g.phrases);
    }
  }
  finish();
  return entries;
}
