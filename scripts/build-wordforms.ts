/**
 * Builds public/data/wordforms.json (Arabic word search key → roots) from verses.json and
 * occurrences.json. Run with `pnpm data:wordforms`. `pnpm data` writes the same file.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { Occurrences, Verses } from '../src/data/types';
import { buildWordForms } from '../src/search/wordForms';

const OUT = 'public/data/wordforms.json';

const verses = JSON.parse(readFileSync('public/data/verses.json', 'utf8')) as Verses;
const occurrences = JSON.parse(readFileSync('public/data/occurrences.json', 'utf8')) as Occurrences;
const json = JSON.stringify(buildWordForms(verses, occurrences));
writeFileSync(OUT, json);
const file = JSON.parse(json) as ReturnType<typeof buildWordForms>;
console.log(`Keys: ${Object.keys(file.forms).length}`);
console.log(`${OUT}: ${(statSync(OUT).size / 1024).toFixed(0)} KB, gzip ${(gzipSync(json).length / 1024).toFixed(0)} KB`);
