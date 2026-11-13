/**
 * Runs the real embedding models on the eval set and prints root hit rates.
 * Slow and opt-in: `pnpm eval:semantic [--model <id>] [--verbose]`.
 * Verse embeddings per model are cached in data/raw/embeddings/ (gitignored).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { EmbeddingsMeta, Galaxy, Occurrences } from '../src/data/types';
import { MODELS, type ModelSpec } from '../src/semantic/models';
import { buildIndex, searchIndex, TOP_VERSES } from '../src/semantic/verseIndex';
import { embedVerses, nodeEmbedder, readVerses } from './semantic/embed-verses';
import { EVAL_SET } from './semantic/eval-set';
import { firstHitRank, summarize } from './semantic/metrics';

const CACHE = 'data/raw/embeddings';
const TOP_VERSE_OPTIONS = [10, 20, 40];

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

/** Verse matrix for one model, from the cache or freshly embedded. */
async function verseMatrix(spec: ModelSpec): Promise<{ meta: EmbeddingsMeta; matrix: Int8Array }> {
  const base = `${CACHE}/${spec.id.replace('/', '__')}`;
  if (!existsSync(`${base}.bin`)) {
    const { bin, meta } = await embedVerses(spec, readVerses(), await nodeEmbedder(spec));
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(`${base}.bin`, bin);
    writeFileSync(`${base}.json`, JSON.stringify(meta));
  }
  const buf = readFileSync(`${base}.bin`);
  return { meta: readJson(`${base}.json`), matrix: new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength) };
}

async function evalModel(spec: ModelSpec, galaxy: Galaxy, occurrences: Occurrences, verbose: boolean): Promise<void> {
  console.log(`\n${spec.id}`);
  const { meta, matrix } = await verseMatrix(spec);
  const index = buildIndex(meta, matrix, occurrences);
  const embedder = await nodeEmbedder(spec);
  const started = Date.now();
  const queries = await embedder.embed(
    EVAL_SET.map((e) => e.query),
    'query',
  );
  console.log(`  ${((Date.now() - started) / EVAL_SET.length).toFixed(0)} ms per query`);

  for (const topVerses of TOP_VERSE_OPTIONS) {
    const ranks = EVAL_SET.map((e, i) => {
      const ranked = searchIndex(index, queries[i]!, e.query, { topVerses })
        .slice(0, 10)
        .map((m) => galaxy.roots[m.id]!.ar);
      const rank = firstHitRank(ranked, e.expect);
      if (verbose && topVerses === TOP_VERSES) console.log(`    ${rank ?? '-'}\t${e.query}: ${ranked.slice(0, 5).join(' ')}`);
      return rank;
    });
    const s = summarize(ranks);
    console.log(
      `  top ${topVerses} verses: hit@1 ${pct(s.hit1)}  hit@5 ${pct(s.hit5)}  MRR ${s.mrr.toFixed(2)}`,
    );
  }
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(4);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.includes('--model') ? args[args.indexOf('--model') + 1] : undefined;
  const specs = Object.values(MODELS).filter((m) => !only || m.id === only);
  const galaxy = readJson<Galaxy>('public/data/galaxy.json');
  const occurrences = readJson<Occurrences>('public/data/occurrences.json');
  console.log(`${EVAL_SET.length} queries; hit = any expected root in the results`);
  for (const spec of specs) await evalModel(spec, galaxy, occurrences, args.includes('--verbose'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
