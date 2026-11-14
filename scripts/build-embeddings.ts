/**
 * Embeds the English text of every verse with the app's model, applies the shipped recipe
 * (neighbour context, short-verse factor) and writes public/data/embeddings.bin (int8 matrix)
 * and public/data/embeddings.json (EmbeddingsMeta).
 * Run with `pnpm embeddings` after `pnpm models`. Not part of `pnpm data`: it needs the model.
 */
import { writeFileSync } from 'node:fs';
import { MODEL } from '../src/semantic/models';
import { wordCount } from './semantic/context';
import { rawVerseVectors, readVerses } from './semantic/embed-verses';
import { applyRecipe, describeRecipe, SHIPPED } from './semantic/recipe';

async function main(): Promise<void> {
  console.log(`Embedding verses with ${MODEL.id} (${describeRecipe(SHIPPED)})`);
  const verses = readVerses();
  const { keys, vectors } = await rawVerseVectors(MODEL, verses);
  const counts = keys.map((k) => wordCount(verses[k]!.en));
  const { bin, meta } = applyRecipe(MODEL.id, keys, vectors, counts, SHIPPED);
  writeFileSync('public/data/embeddings.bin', bin);
  writeFileSync('public/data/embeddings.json', `${JSON.stringify(meta)}\n`);
  console.log(`  embeddings.bin: ${(bin.byteLength / 1e6).toFixed(2)} MB, ${meta.keys.length} × ${meta.dims}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
