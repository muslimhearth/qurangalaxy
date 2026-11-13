/**
 * Downloads the sentence-embedding model into public/models/<id>/ so the app can
 * self-host it. Run with `pnpm models` (or `pnpm models --all` for every candidate).
 * The folder is gitignored; run this before `pnpm build` on the deploy machine.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MODEL, MODEL_FILES, MODELS, type ModelSpec } from '../src/semantic/models';

const OUT_DIR = 'public/models';

/** Downloads every missing file of one model. */
async function fetchModel(spec: ModelSpec): Promise<void> {
  for (const file of MODEL_FILES) {
    const out = join(OUT_DIR, spec.id, file);
    if (existsSync(out)) continue;
    const url = `https://huggingface.co/${spec.id}/resolve/${spec.revision}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download ${url}: HTTP ${res.status}`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, new Uint8Array(await res.arrayBuffer()));
    console.log(`  ${out}`);
  }
}

async function main(): Promise<void> {
  const specs = process.argv.includes('--all') ? Object.values(MODELS) : [MODEL];
  for (const spec of specs) {
    console.log(`${spec.id}@${spec.revision.slice(0, 7)}`);
    await fetchModel(spec);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
