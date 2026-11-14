/**
 * Builds the word card data (G26) from the Corpus morphology file and the Tanzil verses:
 * - public/data/morph/{surah}.json and public/data/morph/tags.json (see src/morph/types.ts);
 * - public/data/particles.json: words without a root, by lemma.
 * `pnpm data` runs it after the main build. Alone (`pnpm data:morph`) it reads galaxy.json and
 * verses.json from public/data/. Raw files are cached in data/raw/.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import type { Galaxy, Verses } from '../src/data/types';
import { buildMorph } from './lib/morph/build';
import { readCached } from './lib/raw-cache';

const OUT_DIR = 'public/data';
const MORPHOLOGY = 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt';

/** Builds and writes the word card files. Throws when the Corpus does not match Tanzil. */
export function writeMorphFiles(morphText: string, galaxy: Galaxy, verses: Verses, outDir = OUT_DIR): void {
  const data = buildMorph(morphText, verses, galaxy.roots);
  if (data.errors.length > 0) {
    for (const e of data.errors.slice(0, 50)) console.error(`  ${e}`);
    throw new Error(`Word morphology check failed with ${data.errors.length} errors`);
  }
  const dir = join(outDir, 'morph');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  data.surahs.forEach((s, i) => writeFileSync(join(dir, `${i + 1}.json`), JSON.stringify(s)));
  writeFileSync(join(dir, 'tags.json'), JSON.stringify(data.tags));
  writeFileSync(join(outDir, 'particles.json'), JSON.stringify(data.particles));

  const gz = (path: string) => gzipSync(readFileSync(path)).length;
  const files = readdirSync(dir).map((f) => join(dir, f));
  const total = files.reduce((n, f) => n + statSync(f).size, 0);
  const totalGz = files.reduce((n, f) => n + gz(f), 0);
  const biggest = Math.max(...files.map(gz));
  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`Morphology: ${data.tags.length} tags, ${data.particles.lemmas.length} particle lemmas`);
  console.log(`  morph/: ${files.length} files, ${kb(total)} (${kb(totalGz)} gzip, largest ${kb(biggest)} gzip)`);
  const particles = join(outDir, 'particles.json');
  console.log(`  particles.json: ${kb(statSync(particles).size)} (${kb(gz(particles))} gzip)`);
}

// Run directly: `tsx scripts/build-morph.ts`.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  readCached('data/raw', 'quran-morphology.txt', MORPHOLOGY)
    .then((morph) => {
      const galaxy = JSON.parse(readFileSync(join(OUT_DIR, 'galaxy.json'), 'utf8')) as Galaxy;
      const verses = JSON.parse(readFileSync(join(OUT_DIR, 'verses.json'), 'utf8')) as Verses;
      writeMorphFiles(morph, galaxy, verses);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
