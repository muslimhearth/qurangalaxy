/**
 * Measures semantic search with the real models. Slow and opt-in.
 *
 *   pnpm eval:semantic                    shipped files (public/data/embeddings.*), per-query hits
 *   pnpm eval:semantic --files <base>     another embedding set (<base>.bin + <base>.json)
 *   pnpm eval:semantic --sweep [--model id] [--verbose]
 *                                         every downloaded model × every recipe in RECIPES
 *
 * Verse search: scripts/semantic/verse-eval.json (recall@10, hit@10, MRR over the top 40).
 * Root search: scripts/semantic/eval-set.ts (hit@1, hit@5, MRR), as in G9.
 * Raw verse vectors per model are cached in data/raw/embeddings/ (gitignored).
 */
import { existsSync, readFileSync } from 'node:fs';
import type { EmbeddingsMeta, Galaxy, Occurrences, VerseKey } from '../src/data/types';
import { MODELS, type ModelSpec } from '../src/semantic/models';
import { buildIndex, searchIndex, searchVerses, type SemanticIndex } from '../src/semantic/verseIndex';
import { wordCount } from './semantic/context';
import { MODEL_DIR, nodeEmbedder, rawVerseVectors, readVerses } from './semantic/embed-verses';
import { EVAL_SET } from './semantic/eval-set';
import { firstHitRank, recallAt, summarize } from './semantic/metrics';
import { applyRecipe, describeRecipe, PLAIN, SHIPPED, type Recipe } from './semantic/recipe';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const VERSE_EVAL = readJson<{ queries: { query: string; expect: VerseKey[] }[] }>('scripts/semantic/verse-eval.json')
  .queries;

/** Recipes compared by `--sweep`, one change at a time, then combinations. */
const RECIPES: Recipe[] = [
  PLAIN,
  { ...PLAIN, self: 0.8, shortSelf: 0.8 },
  { ...PLAIN, self: 0.7, shortSelf: 0.7 },
  { ...PLAIN, self: 0.6, shortSelf: 0.6 },
  { ...PLAIN, self: 0.5, shortSelf: 0.5 },
  { ...PLAIN, lengthPower: 0.1 },
  { ...PLAIN, lengthPower: 0.2 },
  { ...PLAIN, lengthPower: 0.3 },
  { ...PLAIN, self: 1, shortSelf: 0.5 },
  { ...PLAIN, self: 0.8, shortSelf: 0.5 },
  { ...PLAIN, self: 0.7, shortSelf: 0.5 },
  { ...PLAIN, self: 0.8, shortSelf: 0.5, lengthPower: 0.1 },
  { ...PLAIN, self: 0.7, shortSelf: 0.5, lengthPower: 0.1 },
  { ...PLAIN, self: 0.7, shortSelf: 0.5, lengthPower: 0.2 },
  SHIPPED,
];

const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(4);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Query vectors for both eval sets. */
interface Queries {
  verse: Float32Array[];
  root: Float32Array[];
}

async function embedQueries(spec: ModelSpec): Promise<Queries> {
  const embedder = await nodeEmbedder(spec);
  return {
    verse: await embedder.embed(
      VERSE_EVAL.map((e) => e.query),
      'query',
    ),
    root: await embedder.embed(
      EVAL_SET.map((e) => e.query),
      'query',
    ),
  };
}

/** One result row. */
interface Score {
  recall10: number;
  hit10: number;
  mrr: number;
  rootHit1: number;
  rootHit5: number;
  rootMrr: number;
}

function evaluate(index: SemanticIndex, q: Queries, galaxy: Galaxy, verbose: boolean): Score {
  const recalls: number[] = [];
  const ranks = VERSE_EVAL.map((e, i) => {
    const keys = searchVerses(index, q.verse[i]!, 40).map((h) => h.key);
    recalls.push(recallAt(keys, e.expect, 10));
    const rank = firstHitRank(keys, e.expect);
    if (verbose) {
      const found = e.expect.map((k) => `${k}${keys.includes(k) ? `@${keys.indexOf(k) + 1}` : ''}`);
      console.log(`    ${`${rank ?? '-'}`.padStart(2)}  ${e.query.padEnd(34)} top5 ${keys.slice(0, 5).join(' ')}`);
      console.log(`        expect ${found.join(' ')}`);
    }
    return rank;
  });
  const verse = summarize(ranks.map((r) => (r !== null && r <= 40 ? r : null)));
  const rootRanks = EVAL_SET.map((e, i) => {
    const ranked = searchIndex(index, q.root[i]!, e.query)
      .slice(0, 10)
      .map((m) => galaxy.roots[m.id]!.ar);
    return firstHitRank(ranked, e.expect);
  });
  const root = summarize(rootRanks);
  return {
    recall10: mean(recalls),
    hit10: ranks.filter((r) => r !== null && r <= 10).length / ranks.length,
    mrr: verse.mrr,
    rootHit1: root.hit1,
    rootHit5: root.hit5,
    rootMrr: root.mrr,
  };
}

function printRow(label: string, s: Score): void {
  console.log(
    `  ${label.padEnd(30)} verses R@10 ${pct(s.recall10)} hit@10 ${pct(s.hit10)} MRR ${s.mrr.toFixed(2)}` +
      ` | roots hit@1 ${pct(s.rootHit1)} hit@5 ${pct(s.rootHit5)} MRR ${s.rootMrr.toFixed(2)}`,
  );
}

async function sweep(specs: ModelSpec[], verbose: boolean): Promise<void> {
  const galaxy = readJson<Galaxy>('public/data/galaxy.json');
  const occurrences = readJson<Occurrences>('public/data/occurrences.json');
  const verses = readVerses();
  const counts = Object.values(verses).map((v) => wordCount(v.en));
  for (const spec of specs) {
    if (!existsSync(`${MODEL_DIR}${spec.id}/onnx/model_quantized.onnx`)) {
      console.log(`\n${spec.id}: not downloaded, skipped (pnpm models --all)`);
      continue;
    }
    console.log(`\n${spec.id}`);
    const { keys, vectors } = await rawVerseVectors(spec, verses);
    const q = await embedQueries(spec);
    for (const r of RECIPES) {
      const { meta, bin } = applyRecipe(spec.id, keys, vectors, counts, r);
      const index = buildIndex(meta, new Int8Array(bin.buffer, bin.byteOffset, bin.byteLength), occurrences);
      printRow(describeRecipe(r), evaluate(index, q, galaxy, verbose && r === SHIPPED));
    }
  }
}

async function evalFiles(base: string): Promise<void> {
  const meta = readJson<EmbeddingsMeta>(`${base}.json`);
  const spec = MODELS[meta.model];
  if (!spec) throw new Error(`Unknown model ${meta.model} in ${base}.json`);
  const buf = readFileSync(`${base}.bin`);
  const index = buildIndex(
    meta,
    new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength),
    readJson<Occurrences>('public/data/occurrences.json'),
  );
  console.log(`${base}.* (${meta.model})`);
  const s = evaluate(index, await embedQueries(spec), readJson<Galaxy>('public/data/galaxy.json'), true);
  printRow('total', s);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  console.log(`${VERSE_EVAL.length} verse queries, ${EVAL_SET.length} root queries`);
  if (args.includes('--sweep')) {
    const only = arg('--model');
    await sweep(
      Object.values(MODELS).filter((m) => !only || m.id === only),
      args.includes('--verbose'),
    );
  } else {
    await evalFiles(arg('--files') ?? 'public/data/embeddings');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
