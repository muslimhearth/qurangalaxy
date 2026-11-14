/** Exact verse search: query words against the English translation and the transliteration. */
import type { VerseKey, Verses } from '../data/types';
import { queryTerms, stem, termScoreStemmed, textWords, type QueryTerm, type VerseLang } from './terms';
import { plainTranslit, type Translit } from './translit';

/** The words of one language: each distinct word once, and each verse as word ids. */
interface LangIndex {
  vocab: string[];
  /** English stem of each vocab word (the word itself for transliteration). */
  stems: string[];
  verses: Uint32Array[];
}

/** Verses prepared for exact search (built once per data load). */
export interface VerseIndex {
  keys: VerseKey[];
  en: LangIndex;
  tr: LangIndex;
}

/** A verse found by search; `source` tells which text matched best. */
export interface VerseMatch {
  key: VerseKey;
  /** 0..1, higher is better. */
  score: number;
  source: VerseLang | 'semantic';
}

/** Share of the score that comes from the words in order (a phrase). */
const PHRASE = 0.15;

function buildLang(texts: string[], lang: VerseLang): LangIndex {
  const ids = new Map<string, number>();
  const vocab: string[] = [];
  const verses = texts.map((text) =>
    Uint32Array.from(textWords(text, lang), (w) => {
      let id = ids.get(w);
      if (id === undefined) {
        id = vocab.length;
        ids.set(w, id);
        vocab.push(w);
      }
      return id;
    }),
  );
  return { vocab, stems: lang === 'en' ? vocab.map(stem) : vocab, verses };
}

/** Prepares the verses (and transliteration, when loaded) for `exactVerseMatches`. */
export function buildVerseIndex(verses: Verses, translit: Partial<Translit>): VerseIndex {
  const keys = Object.keys(verses) as VerseKey[];
  return {
    keys,
    en: buildLang(
      keys.map((k) => verses[k]!.en),
      'en',
    ),
    tr: buildLang(
      keys.map((k) => plainTranslit(translit[k] ?? '')),
      'tr',
    ),
  };
}

/**
 * Scores every verse of one language: weighted share of query words found, plus a bonus when
 * all words appear in order. Each query word is compared once per distinct word, not per verse.
 */
function scoreLang(terms: QueryTerm[], index: LangIndex, lang: VerseLang): Float32Array {
  const scores = new Float32Array(index.verses.length);
  const total = terms.reduce((s, t) => s + t.weight, 0);
  if (total === 0) return scores;
  // perTerm[j][wordId] = how well query word j matches that word.
  const perTerm = terms.map(({ word }) => {
    const qStem = lang === 'en' ? stem(word) : word;
    return Float32Array.from(index.vocab, (w, id) => termScoreStemmed(word, qStem, w, index.stems[id]!, lang));
  });
  index.verses.forEach((words, v) => {
    let found = 0;
    for (let j = 0; j < terms.length; j++) {
      const weight = terms[j]!.weight;
      if (weight === 0) continue;
      const row = perTerm[j]!;
      let best = 0;
      for (let k = 0; k < words.length; k++) best = Math.max(best, row[words[k]!]!);
      found += weight * best;
    }
    if (found === 0) return;
    if (terms.length === 1) scores[v] = found / total;
    else scores[v] = (1 - PHRASE) * (found / total) + (hasPhrase(perTerm, words) ? PHRASE : 0);
  });
  return scores;
}

/** True when the query words match one after another somewhere in `words`. */
function hasPhrase(perTerm: Float32Array[], words: Uint32Array): boolean {
  const n = perTerm.length;
  for (let i = 0; i + n <= words.length; i++) {
    let j = 0;
    while (j < n && perTerm[j]![words[i + j]!]! > 0) j++;
    if (j === n) return true;
  }
  return false;
}

/** Verses whose English or transliteration contains the query words, best first (ties: Quran order). */
export function exactVerseMatches(index: VerseIndex, query: string, limit: number): VerseMatch[] {
  const en = queryTerms(query, 'en');
  if (en.length === 0) return [];
  const sEn = scoreLang(en, index.en, 'en');
  const sTr = scoreLang(queryTerms(query, 'tr'), index.tr, 'tr');
  const out: VerseMatch[] = [];
  index.keys.forEach((key, v) => {
    const e = sEn[v]!;
    const t = sTr[v]!;
    if (e === 0 && t === 0) return;
    out.push(e >= t ? { key, score: e, source: 'en' } : { key, score: t, source: 'tr' });
  });
  // Array.prototype.sort is stable, so equal scores keep Quran order.
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
