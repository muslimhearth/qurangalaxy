/**
 * Embeds the English text of every verse with the app's model and writes
 * public/data/embeddings.bin (int8 matrix) and public/data/embeddings.json (EmbeddingsMeta).
 * Run with `pnpm embeddings` after `pnpm models`. Not part of `pnpm data`: it needs the model.
 */
import { writeFileSync } from 'node:fs';
import { MODEL } from '../src/semantic/models';
import { embedVerses, nodeEmbedder, readVerses } from './semantic/embed-verses';

async function main(): Promise<void> {
  console.log(`Embedding verses with ${MODEL.id}`);
  const { bin, meta } = await embedVerses(MODEL, readVerses(), await nodeEmbedder(MODEL));
  writeFileSync('public/data/embeddings.bin', bin);
  writeFileSync('public/data/embeddings.json', `${JSON.stringify(meta)}\n`);
  console.log(`  embeddings.bin: ${(bin.byteLength / 1e6).toFixed(2)} MB, ${meta.keys.length} × ${meta.dims}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
