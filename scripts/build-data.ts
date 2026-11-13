/**
 * Builds public/data/*.json from the raw Quran sources. Run with `pnpm data`.
 * Raw files are cached in data/raw/ and downloaded only when missing.
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDataset } from './lib/dataset';
import { readCached } from './lib/raw-cache';

const RAW_DIR = 'data/raw';
const OUT_DIR = 'public/data';

const SOURCES = {
  morphology: {
    name: 'quran-morphology.txt',
    url: 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt',
  },
  arabic: {
    name: 'quran-uthmani.txt',
    url: 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true',
  },
  english: {
    name: 'en.sahih.txt',
    url: 'https://tanzil.net/trans/?transID=en.sahih&type=txt-2',
  },
};

async function main(): Promise<void> {
  const [morph, arabic, english] = await Promise.all(
    [SOURCES.morphology, SOURCES.arabic, SOURCES.english].map((s) => readCached(RAW_DIR, s.name, s.url)),
  );
  const data = buildDataset(morph!, arabic!, english!);

  console.log(`Alignment mismatches: ${data.mismatches.length}`);
  for (const m of data.mismatches) console.log(`  ${m.verse}: tanzil ${m.text} words, corpus ${m.corpus}`);

  if (data.errors.length > 0) {
    for (const e of data.errors.slice(0, 50)) console.error(`  ${e}`);
    throw new Error(`Validation failed with ${data.errors.length} errors`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const files = { 'galaxy.json': data.galaxy, 'occurrences.json': data.occurrences, 'verses.json': data.verses };
  for (const [name, value] of Object.entries(files)) writeFileSync(join(OUT_DIR, name), JSON.stringify(value));

  console.log(`Roots: ${data.galaxy.roots.length}`);
  console.log(`Words with a root: ${data.rootWordCount}`);
  console.log(`Verses: ${Object.keys(data.verses).length}`);
  console.log(`Edges: ${data.galaxy.edges.length}`);
  console.log(`Clusters: ${data.galaxy.clusterCount}`);
  for (const name of Object.keys(files)) {
    const kb = statSync(join(OUT_DIR, name)).size / 1024;
    console.log(`  ${name}: ${kb.toFixed(0)} KB`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
