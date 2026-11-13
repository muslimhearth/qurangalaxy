import type { Root } from '../data/types';
import { ARABIC_LETTER, normalizeArabic } from './normalize';
import { TIER, type Match, type Matcher } from './types';

/**
 * Latin spelling search: "noor" finds نور, "rahmaan" finds رحم through رَحْمٰن.
 *
 * The query becomes a pattern of tokens. Each token lists the Arabic letter sequences it can
 * stand for, each with a small cost (0 = a normal spelling, higher = less likely). A dynamic
 * program then finds the cheapest way to spell a normalized lemma or root with the pattern.
 * Lower cost means a slightly lower score inside the same tier (exact, prefix, contains).
 */

/** One way to read a token: Arabic letters (may be empty) and how unusual that reading is. */
type Option = readonly [letters: string, cost: number];
/** One query token (a consonant, digraph or vowel run) and its possible readings. */
type Token = readonly Option[];

/** A searchable Arabic form: one lemma or the root letters, normalized. */
interface Entry {
  id: number;
  /** Normalized Arabic letters (no diacritics, one alef form). */
  text: string;
  /** Shown as the match reason: the lemma with diacritics, or the root letters. */
  shown: string;
  /** Bit set of the letters in `text` (see letterBits), for a fast pre-check. */
  bits: number;
  /** Vowel sequence from the diacritics ("a", "i", "u"); null for root letters, which have none. */
  vowels: string | null;
}

// A missing short vowel costs almost nothing: Arabic rarely writes them. The tiny cost makes a
// written long vowel win a tie ("halal" = حَلال over حَلَلْ). Vowel quality is scored separately
// against the lemma's diacritics (see vowelsOf).
const SKIP_SHORT = 0.05;
// Cost per vowel that differs from the lemma's diacritics ("zikr" prefers ذِكْر over ذَكَرَ).
const VOWEL_WEIGHT = 0.1;
// Cost of a missing long vowel ("aa", "ee", "oo"): the Arabic may write it as a small mark only.
const SKIP_LONG = 1;
// Score lost per cost unit, and the most a match can lose, so tiers never overlap.
const COST_WEIGHT = 0.02;
const MAX_PENALTY = 0.15;

/** Two-letter Latin spellings of one Arabic letter. */
const DIGRAPHS: Record<string, Token> = {
  sh: [['ش', 0]],
  kh: [['خ', 0]],
  gh: [['غ', 0]],
  // "th" is ث in most schemes, ذ in some (e.g. "thikr").
  th: [['ث', 0], ['ذ', 0.5]],
  // "dh" is ذ (dhikr) or ض (Ramadhan); ظ in some schemes.
  dh: [['ذ', 0], ['ض', 0], ['ظ', 0.5]],
  zh: [['ظ', 0]],
  ch: [['ش', 1]],
};

/** One Latin letter or chat-alphabet digit to Arabic letters. Ambiguous ones list every choice. */
const LETTERS: Record<string, Token> = {
  b: [['ب', 0]],
  p: [['ب', 0.5]],
  // ة (taa marbuta) is written "t" before a vowel ("salat") and "h" at the end ("salah").
  t: [['ت', 0], ['ط', 0], ['ة', 0]],
  j: [['ج', 0]],
  g: [['ج', 0.5], ['غ', 0.5], ['ق', 1]],
  h: [['ه', 0], ['ح', 0], ['ة', 0]],
  // Changed in tokenize at the end of a word: there "h" is mostly ة ("salah"), less often ح.
  d: [['د', 0], ['ض', 0]],
  r: [['ر', 0]],
  // Many speakers say ذ as "z" (zikr), so z also covers it.
  z: [['ز', 0], ['ظ', 0], ['ذ', 0.5]],
  s: [['س', 0], ['ص', 0], ['ث', 1]],
  f: [['ف', 0]],
  v: [['ف', 0.5]],
  q: [['ق', 0], ['ك', 0.5]],
  k: [['ك', 0], ['ق', 0]],
  c: [['ك', 0.5], ['ق', 0.5], ['س', 1]],
  l: [['ل', 0]],
  m: [['م', 0]],
  n: [['ن', 0]],
  w: [['و', 0]],
  y: [['ي', 0]],
  // Chat alphabet: digits that look like Arabic letters. Hamza (2) is normalized to ا.
  // Hamza (2) sits on alef (normalized to ا), waw (مؤمن) or yaa (قائم).
  '2': [['ا', 0], ['و', 0], ['ي', 0]],
  '3': [['ع', 0]],
  '5': [['خ', 0]],
  '6': [['ط', 0]],
  '7': [['ح', 0]],
  '8': [['غ', 0]],
  '9': [['ص', 0], ['ق', 0]],
};

// A final "h" ("salah", "jannah") is most often ة or ه; ح ("ruh") is a little less likely.
const FINAL_H: Token = [['ة', 0], ['ه', 0], ['ح', 0.5]];

// Apostrophes mark hamza (normalized to ا) or ain; both can also be silent in the lemma.
const APOSTROPHES = /['`ʿʾʼʻ’‘]/;
const VOWELS = 'aeiou';

/**
 * Readings of a vowel run. Short vowels are usually not written in Arabic; long ones are
 * ا, ي or و. A word-initial vowel sits on an alef (hamza) or ain, e.g. "iman" = ايمان.
 */
function vowelToken(vowel: string, long: boolean, first: boolean, last: boolean): Token {
  const skip = long ? SKIP_LONG : SKIP_SHORT;
  // Each vowel class has its long letter: a = ا, i/e = ي, u/o = و.
  const letter = vowel === 'a' ? 'ا' : vowel === 'i' || vowel === 'e' ? 'ي' : 'و';
  const out: Option[] = [['', skip], [letter, 0]];
  // Users rarely mark ain at the start ("ilm" = علم), so there it is a normal reading.
  if (first) out.push(['ع', 0]);
  else out.push(['ع', 1]);
  if (first && letter !== 'ا') out.push(['ا' + letter, 0], ['ا', 0], ['ع' + letter, 0]);
  // A final "a" can be taa marbuta (rahma = رحمة) or alef maqsura (taqwa = تقوى → تقوي).
  if (last && letter === 'ا') out.push(['ة', 0], ['ي', 0]);
  return out;
}

/** A doubled consonant ("nn") is one letter with shadda, or rarely two written letters. */
function doubled(token: Token): Token {
  return token.flatMap(([l, c]): Option[] => [[l, c], [l + l, c]]);
}

/** Lowercases, strips Latin diacritics and a leading article ("al-", "ar-rahman"). */
function cleanQuery(query: string): string {
  const q = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  // Article: "al-", "el-", or an assimilated one like "ar-r..." / "as-s...", then a hyphen or space.
  const noArticle = q.replace(/^(?:[ae]l|a(sh|th|dh|[tdrzsnl]))[-\s]+(?=\1)/, '').replace(/^[ae]l[-\s]+/, '');
  return noArticle.replace(/[-\s]+/g, '');
}

/** Turns a Latin query into tokens, or null when it has a character we cannot read. */
export function tokenize(query: string): Token[] | null {
  const q = cleanQuery(query);
  const tokens: Token[] = [];
  let i = 0;
  while (i < q.length) {
    const ch = q[i]!;
    if (VOWELS.includes(ch)) {
      // A run of the same vowel ("aa", "ee") is one long vowel; "oo" and "ee" are long too.
      let j = i + 1;
      while (q[j] === ch) j++;
      tokens.push(vowelToken(ch, j - i > 1, i === 0, j === q.length));
      i = j;
      continue;
    }
    if (APOSTROPHES.test(ch)) {
      tokens.push([['', SKIP_SHORT], ['ا', 0], ['ع', 0]]);
      i++;
      continue;
    }
    const pair = q.slice(i, i + 2);
    const digraph = DIGRAPHS[pair];
    const single = LETTERS[ch];
    let token: Token;
    let width: number;
    if (digraph) {
      // "sh" may also be two letters (Ishaq = إسحاق): keep that reading at a cost.
      const split = single && LETTERS[pair[1]!] ? combine(single, LETTERS[pair[1]!]!, 1) : [];
      token = [...digraph, ...split];
      width = 2;
    } else if (single) {
      token = ch === 'h' && i === q.length - 1 && i > 0 ? FINAL_H : single;
      width = 1;
    } else return null;
    // "nn", "bb", "shsh": the same consonant twice is a doubled letter.
    if (q.slice(i + width, i + 2 * width) === q.slice(i, i + width)) {
      token = doubled(token);
      width *= 2;
    }
    tokens.push(token);
    i += width;
  }
  // A pattern with no consonant ("aa") would match almost anything.
  return tokens.some((t) => t.every(([l]) => l !== '')) ? tokens : null;
}

/** All two-letter readings of two tokens, with an extra cost. */
function combine(a: Token, b: Token, extra: number): Option[] {
  return a.flatMap(([la, ca]) => b.map(([lb, cb]): Option => [la + lb, ca + cb + extra]));
}

/** Cheapest costs of spelling `text` with `tokens`: whole text, a prefix, and any inner part. */
function matchCosts(tokens: Token[], text: string, row: Float64Array, next: Float64Array) {
  const n = text.length;
  // Two DP rows per mode: cost to match tokens[i..] starting at text[j]. Row i+1 is `next`.
  // We run it twice: exact (must end at text end) and open (may end anywhere).
  const run = (open: boolean): Float64Array => {
    for (let j = 0; j <= n; j++) next[j] = open || j === n ? 0 : Infinity;
    for (let t = tokens.length - 1; t >= 0; t--) {
      for (let j = 0; j <= n; j++) {
        let bestCost = Infinity;
        for (const [letters, cost] of tokens[t]!) {
          const k = j + letters.length;
          if (k > n || next[k] === Infinity) continue;
          if (letters && !text.startsWith(letters, j)) continue;
          const c = cost + next[k]!;
          if (c < bestCost) bestCost = c;
        }
        row[j] = bestCost;
      }
      next.set(row.subarray(0, n + 1));
    }
    return next;
  };
  const exact = run(false)[0]!;
  const open = run(true);
  let contains = Infinity;
  for (let j = 1; j < n; j++) if (open[j]! < contains) contains = open[j]!;
  return { exact, prefix: open[0]!, contains };
}

// Built once per roots array: typing must stay fast over ~6,300 forms.
const INDEX = new WeakMap<readonly Root[], Entry[]>();

function entry(id: number, text: string, shown: string, vowels: string | null): Entry {
  return { id, text, shown, vowels, bits: letterBits(text) };
}

/**
 * A 32-bit set of letters. Arabic letters sit at U+0621..U+064A; two letters may share a bit,
 * which only makes the pre-check less strict, never wrong.
 */
function letterBits(text: string): number {
  let bits = 0;
  for (let i = 0; i < text.length; i++) bits |= 1 << ((text.charCodeAt(i) - 0x621) & 31);
  return bits;
}

/**
 * For each token that must use a letter (no empty reading), the bits of the letters it can
 * start with. A form that lacks all of them for any such token cannot match.
 */
function requiredBits(tokens: Token[]): number[] {
  return tokens
    .filter((t) => t.every(([l]) => l !== ''))
    .map((t) => t.reduce((bits, [l]) => bits | letterBits(l[0]!), 0));
}

/** Lemmas first (most frequent first), then root letters: on equal cost the first form wins. */
function entriesFor(roots: readonly Root[]): Entry[] {
  let entries = INDEX.get(roots);
  if (!entries) {
    entries = [];
    for (const root of roots) {
      for (const l of root.lemmas) entries.push(entry(root.id, searchForm(l.ar), l.ar, vowelsOf(l.ar)));
      entries.push(entry(root.id, searchForm(root.ar), root.ar, null));
    }
    INDEX.set(roots, entries);
  }
  return entries;
}

/**
 * Arabic text as the pattern sees it: normalized, but hamza on waw/yaa keeps its seat letter
 * ("mumin" = مؤمن → مومن) and a doubled alef from hamza + alef is one ("quran" = قرءان → قران).
 */
export function searchForm(ar: string): string {
  return normalizeArabic(ar.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')).replace(/اا+/g, 'ا');
}

// Diacritic and letter → vowel. A long vowel letter right after its short vowel adds nothing.
const SHORT: Record<string, string> = { 'َ': 'a', 'ً': 'a', 'ِ': 'i', 'ٍ': 'i', 'ُ': 'u', 'ٌ': 'u', 'ٰ': 'a' };
const LONG: Record<string, string> = { 'ا': 'a', 'ى': 'a', 'ي': 'i', 'و': 'u' };

// Arabic marks (harakat, Quranic signs, tatweel): they keep the vowel state of the letter before.
const MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

/** Vowel sequence of a lemma from its diacritics, e.g. ذِكْر → "i", ذَكَرَ → "aaa", إِيمان → "ia". */
export function vowelsOf(ar: string): string {
  let out = '';
  let prevShort = '';
  for (const ch of ar) {
    const short = SHORT[ch];
    if (short) {
      // Fatha + dagger alef is one long "a".
      if (!(ch === 'ٰ' && prevShort === 'a')) out += short;
      prevShort = short;
      continue;
    }
    const long = LONG[ch];
    // A long letter after its own short vowel (فِي, نُور) or a bare alef (كِتاب) is a vowel;
    // a letter after sukun or another vowel is a consonant (يَوْم).
    if (long && prevShort === long) {
      prevShort = '';
      continue;
    }
    if (ch === 'ا' && prevShort === '') out += 'a';
    if (!MARK.test(ch)) prevShort = '';
  }
  return out;
}

/** Vowel sequence a Latin query asks for: e→i, o→u, runs collapsed ("eemaan" → "ia"). */
export function queryVowels(clean: string): string {
  return clean
    .replace(/[^aeiou]/g, ' ')
    .replace(/e/g, 'i')
    .replace(/o/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s/g, '');
}

/** Edit distance between two short strings. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Score inside a tier: the cheaper the spelling, the closer to the tier's top. */
function scoreOf(tier: number, cost: number): number {
  return Math.round((tier - Math.min(cost * COST_WEIGHT, MAX_PENALTY)) * 1000) / 1000;
}

/** Finds roots by a Latin spelling of a lemma or root ("noor", "rahmaan", "3ilm"). */
export const spellingMatcher: Matcher = (roots, query) => {
  if (ARABIC_LETTER.test(query)) return [];
  const clean = cleanQuery(query);
  if (clean.length < 2) return [];
  const tokens = tokenize(query);
  if (!tokens) return [];
  // Prefix and inner matches on two letters would hit hundreds of roots.
  const partial = clean.length >= 3;
  const qv = queryVowels(clean);
  const entries = entriesFor(roots);
  const row = new Float64Array(64);
  const next = new Float64Array(64);
  const required = requiredBits(tokens);
  const best = new Map<number, Match>();
  for (const e of entries) {
    if (e.text.length >= 63 || !required.every((b) => (e.bits & b) !== 0)) continue;
    const { exact, prefix, contains } = matchCosts(tokens, e.text, row, next);
    if (exact === Infinity && (!partial || (prefix === Infinity && contains === Infinity))) continue;
    // Root letters carry no vowels: count every query vowel as a miss, so lemmas win ties.
    const vowelCost = VOWEL_WEIGHT * (e.vowels === null ? qv.length : editDistance(qv, e.vowels));
    let score = 0;
    if (exact < Infinity) score = scoreOf(TIER.exact, exact + vowelCost);
    else if (prefix < Infinity) score = scoreOf(TIER.prefix, prefix + vowelCost);
    else score = scoreOf(TIER.contains, contains + vowelCost);
    if (!score) continue;
    const old = best.get(e.id);
    if (!old || score > old.score) best.set(e.id, { id: e.id, score, reason: { kind: 'latin', text: e.shown } });
  }
  return [...best.values()];
};
