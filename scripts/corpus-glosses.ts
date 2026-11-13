/**
 * Aggregates the cached corpus word-by-word pages into `data/derived/corpus-glosses.json`.
 * Run with `pnpm corpus:glosses` after `pnpm corpus:wbw`.
 *
 * LOCAL EVALUATION ONLY: output stays in data/derived/ (gitignored). Never write it to public/data/.
 * Also writes `data/derived/corpus-wbw-validation.json` and prints coverage and spot checks.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { aggregateGlosses, collectVerses, validateWordCounts } from './lib/corpus-wbw/aggregate';
import { CORPUS_GLOSSES_PATH, type CorpusGlossFile } from './lib/corpus-wbw/load';
import { indexMorphology } from './lib/corpus-wbw/morph-index';
import { parseWordByWordPage } from './lib/corpus-wbw/parse';

const PAGE_DIR = 'data/raw/corpus-wbw/pages';
const TOP_N = 8;
/** Roots shown in the spot-check table (frequent and rare). */
const SPOT_ROOTS = (process.argv[2] ?? '').split(',').filter((r) => r !== '');

const index = indexMorphology(readFileSync('data/raw/quran-morphology.txt', 'utf8'));
const pages = readdirSync(PAGE_DIR).map((name) => parseWordByWordPage(readFileSync(join(PAGE_DIR, name), 'utf8')));
const verses = collectVerses(pages);
const validation = validateWordCounts(verses, index.verseWordCounts);
const aggregate = aggregateGlosses([...verses.values()].flat(), index, TOP_N);

const file: CorpusGlossFile = {
  meta: {
    source: 'Quranic Arabic Corpus word-by-word pages (corpus.quran.com/wordbyword.jsp)',
    licence: 'LOCAL EVALUATION ONLY: permission requested, not granted. Do not commit or ship.',
    generated: new Date().toISOString(),
    topN: TOP_N,
  },
  ...aggregate,
};
mkdirSync('data/derived', { recursive: true });
writeFileSync(CORPUS_GLOSSES_PATH, JSON.stringify(file, null, 1));
writeFileSync('data/derived/corpus-wbw-validation.json', JSON.stringify(validation, null, 1));

// Coverage against the morphology: how many lemmas and roots got at least one gloss.
const allLemmas = new Set<string>();
const allRoots = new Set<string>();
let morphWords = 0;
for (const w of index.words.values()) {
  morphWords++;
  if (w.lemma) allLemmas.add(w.lemma);
  if (w.root) allRoots.add(w.root);
}
console.log(`Pages: ${pages.length}`);
console.log(
  `Verses: ${verses.size}/${index.verses.length} scraped, ${validation.complete} complete, ` +
    `${validation.mismatches.length} mismatches, ${validation.missing.length} missing`,
);
for (const m of validation.mismatches.slice(0, 20)) console.log(`  mismatch ${m.verse}: expected ${m.expected}, got ${m.actual}`);
console.log(`Words: ${aggregate.words.total}/${morphWords} scraped, ${aggregate.words.withLemma} with lemma, ${aggregate.words.withRoot} with root`);
console.log(`Lemmas: ${Object.keys(aggregate.lemmas).length}/${allLemmas.size}`);
console.log(`Roots: ${Object.keys(aggregate.roots).length}/${allRoots.size}`);

if (SPOT_ROOTS.length > 0) {
  console.log('\n| Root | Words | Top root glosses | Top lemma (glosses) |\n|---|---|---|---|');
  for (const root of SPOT_ROOTS) {
    const r = aggregate.roots[root];
    if (!r) {
      console.log(`| ${root} | 0 | (none) | |`);
      continue;
    }
    const lemmas = Object.entries(aggregate.lemmas)
      .filter(([, l]) => l.root === root)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([ar, l]) => `${ar} (${l.glosses.slice(0, 3).map((g) => g.gloss).join(', ')})`)
      .join('; ');
    const glosses = r.glosses.slice(0, 5).map((g) => `${g.gloss} ${g.count}`).join(', ');
    console.log(`| ${root} | ${r.count} | ${glosses} | ${lemmas} |`);
  }
}
