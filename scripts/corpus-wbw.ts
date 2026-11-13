/**
 * Downloads the Quranic Arabic Corpus word-by-word pages (English gloss per word).
 * Run with `pnpm corpus:wbw`.
 *
 * LOCAL EVALUATION ONLY: the corpus team has not yet allowed reuse of the glosses.
 * Pages are cached in data/raw/corpus-wbw/pages/ (gitignored). Never commit or ship them.
 *
 * Polite: checks robots.txt, one request at a time, at most one per second,
 * generic User-Agent, backoff on errors, stops after repeated failures.
 * Resumable: a rerun parses the cache and fetches only verses not yet covered.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { completeVerses, nextUncovered, pageUrl } from './lib/corpus-wbw/coverage';
import { indexMorphology } from './lib/corpus-wbw/morph-index';
import { extractTable, parseWordByWordPage } from './lib/corpus-wbw/parse';
import { createPoliteFetcher, isAllowedByRobots, USER_AGENT } from './lib/corpus-wbw/polite-fetch';
import { readCached } from './lib/raw-cache';

const RAW_DIR = 'data/raw';
const PAGE_DIR = join(RAW_DIR, 'corpus-wbw', 'pages');
const MORPH_URL = 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt';
/** 1.1 s between request starts keeps us safely under one request per second. */
const INTERVAL_MS = 1100;
/** Stop the run after this many verses fail in a row (each after all retries). */
const MAX_CONSECUTIVE_FAILURES = 3;

/** File name of the cached page that starts at a verse, e.g. `2-255.html`. */
const pageFile = (verse: string) => join(PAGE_DIR, `${verse.replace(':', '-')}.html`);

/** Returns robots.txt, or undefined when the site has none (404 or a redirect to a page). */
async function fetchRobots(): Promise<string | undefined> {
  const res = await fetch('https://corpus.quran.com/robots.txt', {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'manual',
  });
  if (res.status === 200) return res.text();
  if (res.status === 404 || (res.status >= 300 && res.status < 400)) return undefined;
  throw new Error(`robots.txt check failed: HTTP ${res.status}`);
}

async function main() {
  const index = indexMorphology(await readCached(RAW_DIR, 'quran-morphology.txt', MORPH_URL));
  const robots = await fetchRobots();
  console.log(robots === undefined ? 'No robots.txt (no rules).' : `robots.txt:\n${robots}`);
  if (!isAllowedByRobots(robots, '/wordbyword.jsp')) {
    console.error('robots.txt disallows /wordbyword.jsp. Stopping.');
    process.exit(2);
  }

  mkdirSync(PAGE_DIR, { recursive: true });
  // Rebuild coverage from the cache: the start verse of each page, plus every complete verse on it.
  const covered = new Set<string>();
  for (const name of readdirSync(PAGE_DIR)) {
    const words = parseWordByWordPage(readFileSync(join(PAGE_DIR, name), 'utf8'));
    covered.add(name.replace('.html', '').replace('-', ':'));
    for (const verse of completeVerses(words, index.verseWordCounts)) covered.add(verse);
  }
  const total = index.verses.length;
  console.log(`Cached: ${covered.size}/${total} verses.`);

  const fetchPage = createPoliteFetcher({ intervalMs: INTERVAL_MS });
  let failures = 0;
  let requests = 0;
  for (let verse = nextUncovered(index.verses, covered); verse; verse = nextUncovered(index.verses, covered)) {
    try {
      const table = extractTable(await fetchPage(pageUrl(verse)));
      const words = table ? parseWordByWordPage(table) : [];
      if (words.length === 0) throw new Error(`no words on page ${verse}`);
      if (!existsSync(pageFile(verse))) writeFileSync(pageFile(verse), table!);
      // The start verse counts as done even if incomplete, so a bad verse cannot loop forever.
      covered.add(verse);
      for (const v of completeVerses(words, index.verseWordCounts)) covered.add(v);
      failures = 0;
      requests++;
      if (requests % 25 === 0) console.log(`${new Date().toISOString()} ${covered.size}/${total} verses (at ${verse})`);
    } catch (error) {
      failures++;
      console.error(`Failed ${verse}: ${(error as Error).message}`);
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`Stopping after ${failures} failures in a row. Rerun to resume.`);
        process.exit(1);
      }
    }
  }
  console.log(`Done: ${covered.size}/${total} verses, ${requests} requests this run.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
