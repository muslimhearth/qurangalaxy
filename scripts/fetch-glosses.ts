/**
 * Fetches the Wiktionary pages the English meanings need into data/raw/wiktionary/.
 * Run with `pnpm data:glosses`. `pnpm data` runs it too; it only fetches what is missing,
 * so later runs are offline. Delete the folder to refresh from Wiktionary.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { aggregateRoots } from './lib/aggregate';
import { fillCache, loadCache, saveCache } from './lib/glosses/cache';
import { formOfTargets } from './lib/glosses/glosses';
import { createClient } from './lib/glosses/wiki-client';
import { parseMorphology } from './lib/morphology';
import { readCached } from './lib/raw-cache';

/** Folder of the Wiktionary cache. */
export const WIKI_DIR = 'data/raw/wiktionary';

/** Loads the cache, fetches whatever is missing for the corpus roots, saves it and returns it. */
export async function ensureWiktionary(morphText: string) {
  const roots = aggregateRoots(parseMorphology(morphText).rootWords).roots;
  const cache = loadCache(WIKI_DIR);
  await fillCache(cache, roots, createClient(), {
    extraTitles: (c) => formOfTargets(roots, c),
    onProgress: (msg) => {
      console.log(`Wiktionary ${msg}`);
      saveCache(WIKI_DIR, cache);
    },
  });
  saveCache(WIKI_DIR, cache);
  return cache;
}

// Run directly: `tsx scripts/fetch-glosses.ts`.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  readCached(
    'data/raw',
    'quran-morphology.txt',
    'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt',
  )
    .then(ensureWiktionary)
    .then((c) => console.log(`Cached ${Object.keys(c.pages).length} pages`))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
