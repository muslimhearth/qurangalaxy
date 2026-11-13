/**
 * Arabic spelling helpers for matching corpus roots and lemmas to Wiktionary pages.
 */
import { normalizeArabic } from '../../../src/search/normalize';

const HAMZA = /[أإآٱءؤئ]/g;
const SUPERSCRIPT_ALEF = /ٰ/g;
// Harakat, Quranic marks and tatweel; the superscript alef is handled separately.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640]/g;
const SHADDA = 'ّ';
const SUKUN = 'ْ';

/** Corpus root letters ("أله") as a Wiktionary root title part ("ء ل ه"). */
export function wiktionaryRoot(root: string): string {
  return [...root.replace(HAMZA, 'ء')].join(' ');
}

/** Comparable form of a root in any spelling: no spaces or "|", one hamza letter. */
export function rootKey(root: string): string {
  return root.replace(/[\s|]/g, '').replace(HAMZA, 'ء').replace(/ا/g, 'ء');
}

/** Wiktionary page title for a vocalized word: no diacritics, ٱ written ا, hamza forms kept. */
export function pageTitle(word: string): string {
  return word.replace(SUPERSCRIPT_ALEF, '').replace(MARKS, '').replace(/ٱ/g, 'ا');
}

/** Spelling key for matching a lemma: letters only, superscript alef as ا, ة as ت. */
export function lemmaKey(word: string): string {
  return normalizeArabic(word.replace(SUPERSCRIPT_ALEF, 'ا')).replace(/ة/g, 'ت');
}

/** Looser key: the lemma key without any alef, for spellings that differ in long a. */
export function looseKey(word: string): string {
  return lemmaKey(word).replace(/ا/g, '');
}

interface Unit {
  base: string;
  vowel: string;
  shadda: boolean;
  marked: boolean;
}

/** Splits a word into letters with their marks, dropping alefs (spelled in different ways). */
function units(word: string): Unit[] {
  const out: Unit[] = [];
  for (const ch of word.replace(SUPERSCRIPT_ALEF, 'ا')) {
    if (/[\u064B-\u0652]/.test(ch)) {
      const u = out.at(-1);
      if (!u) continue;
      u.marked = true;
      if (ch === SHADDA) u.shadda = true;
      else u.vowel = ch;
    } else if (!MARKS.test(ch)) {
      out.push({ base: normalizeArabic(ch).replace(/ة/g, 'ت'), vowel: '', shadda: false, marked: false });
    }
    MARKS.lastIndex = 0;
  }
  return out.filter((u) => u.base !== 'ا' && u.base !== '');
}

/**
 * How well two vocalized spellings of the same letters agree: +1 per equal vowel or
 * shared shadda, -1 per conflict. Missing marks are neutral. Different letters score -100.
 */
export function vowelScore(a: string, b: string): number {
  const ua = units(a);
  const ub = units(b);
  if (ua.length !== ub.length || ua.some((u, i) => u.base !== ub[i]!.base)) return -100;
  let score = 0;
  ua.forEach((x, i) => {
    const y = ub[i]!;
    if (x.vowel && y.vowel) {
      if (x.vowel === y.vowel) score += 1;
      // A written sukun against nothing is common; against a vowel it is a conflict.
      else if (x.vowel !== SUKUN || y.vowel !== SUKUN) score -= 1;
    }
    if (x.shadda && y.shadda) score += 1;
    else if ((x.shadda && y.marked) || (y.shadda && x.marked)) score -= 1;
  });
  return score;
}
