/**
 * Builds public/data/translit.json (verse key → Tanzil English transliteration) for verse search.
 * Run with `pnpm data:translit`. The raw file is cached in data/raw/. Needs verses.json first.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import type { VerseKey, Verses } from '../src/data/types';
import { readCached } from './lib/raw-cache';
import { buildTranslit } from './lib/translit';

const SOURCE = 'https://tanzil.net/trans/?transID=en.transliteration&type=txt-2';
const OUT = 'public/data/translit.json';

async function main(): Promise<void> {
  const raw = await readCached('data/raw', 'en.transliteration.txt', SOURCE);
  const verses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
  const translit = buildTranslit(raw, Object.keys(verses) as VerseKey[]);
  writeFileSync(OUT, JSON.stringify(translit));
  console.log(`Verses: ${Object.keys(translit).length}, ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
