/**
 * Builds the data of the surah reader and the lemma filter. Run with `pnpm data:reader`
 * after `pnpm data` (it reads galaxy.json and occurrences.json):
 * - public/data/lemmas.json: lemma index per root word (see src/data/lemmaIndex.ts);
 * - src/reader/surahs.json: surah names and verse counts from Tanzil's quran-data.js.
 * Raw files are cached in data/raw/.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import type { Galaxy, Occurrences } from '../src/data/types';
import { buildLemmaIndex } from './lib/lemmaIndex';
import { parseMorphology } from './lib/morphology';
import { readCached } from './lib/raw-cache';
import { parseSurahs } from './lib/surahs';

const MORPHOLOGY = 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt';
const QURAN_DATA = 'https://tanzil.net/res/text/metadata/quran-data.js';
const LEMMAS_OUT = 'public/data/lemmas.json';
const SURAHS_OUT = 'src/reader/surahs.json';

async function main(): Promise<void> {
  const [morph, meta] = await Promise.all([
    readCached('data/raw', 'quran-morphology.txt', MORPHOLOGY),
    readCached('data/raw', 'quran-data.js', QURAN_DATA),
  ]);
  const galaxy = JSON.parse(readFileSync('public/data/galaxy.json', 'utf8')) as Galaxy;
  const occurrences = JSON.parse(readFileSync('public/data/occurrences.json', 'utf8')) as Occurrences;

  const lemmas = buildLemmaIndex(parseMorphology(morph).rootWords, galaxy.roots, occurrences);
  writeFileSync(LEMMAS_OUT, JSON.stringify(lemmas));
  const surahs = parseSurahs(meta);
  writeFileSync(SURAHS_OUT, JSON.stringify(surahs) + '\n');

  console.log(`Lemma words: ${lemmas.reduce((n, r) => n + r.length, 0)}, ${(statSync(LEMMAS_OUT).size / 1024).toFixed(0)} KB`);
  console.log(`Surahs: ${surahs.length}, verses: ${surahs.reduce((n, s) => n + s.verses, 0)}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
