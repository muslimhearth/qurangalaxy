/**
 * Measures Arabic word search: does the plain spelling of each Quran root word find its root?
 * Plain spelling = Tanzil "Simple Clean" text (no diacritics), as a user types it. Run with
 * `pnpm eval:wordforms` after `pnpm data:wordforms`. The raw file is cached in data/raw/ (not shipped).
 */
import { readFileSync } from 'node:fs';
import type { Occurrences, VerseKey, Verses } from '../src/data/types';
import { indexWordForms, type WordFormsFile } from '../src/search/wordForms';
import { readCached } from './lib/raw-cache';
import { parseTanzil } from './lib/tanzil';
import { wordFormCoverage } from './lib/wordform-coverage';

const SOURCE = 'https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true';
const BASMALA_WORDS = 4;

/** Simple Clean verses aligned to the Uthmani word count where a simple fix makes them agree. */
function align(simple: Map<VerseKey, string>, verses: Verses): Map<VerseKey, string> {
  const out = new Map<VerseKey, string>();
  for (const [key, text] of simple) {
    const target = verses[key]!.ar.split(' ').length;
    let words = text.trim().split(/\s+/);
    // Simple Clean keeps the basmala before verse 1; the app's Uthmani text does not.
    if (key.endsWith(':1') && words.length === target + BASMALA_WORDS) words = words.slice(BASMALA_WORDS);
    // Uthmani joins the vocative to its noun (يَٰٓأَيُّهَا); Simple Clean writes "يا أيها".
    if (words.length > target) words = words.join(' ').replace(/(^| )يا /g, '$1يا').split(' ');
    out.set(key, words.join(' '));
  }
  return out;
}

async function main(): Promise<void> {
  const raw = await readCached('data/raw', 'quran-simple-clean.txt', SOURCE);
  const verses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
  const occurrences = JSON.parse(readFileSync('public/data/occurrences.json', 'utf8')) as Occurrences;
  const file = JSON.parse(readFileSync('public/data/wordforms.json', 'utf8')) as WordFormsFile;
  const c = wordFormCoverage(indexWordForms(file), verses, occurrences, align(parseTanzil(raw), verses));
  const pct = (n: number) => `${((100 * n) / c.tokens).toFixed(2)}%`;
  console.log(`Root words checked: ${c.tokens} (skipped, word counts differ: ${c.skipped})`);
  console.log(`Root found: ${c.found} (${pct(c.found)}); top root: ${c.top1} (${pct(c.top1)})`);
  console.log('Most frequent misses (typed | Uthmani | n):');
  for (const m of c.misses.slice(0, 15)) console.log(`  ${m.typed} | ${m.uthmani} | ${m.n}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
