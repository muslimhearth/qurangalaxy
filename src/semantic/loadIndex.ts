/** Lazy, cached loading of the verse embeddings (only when semantic search is used). */
import { loadOccurrences } from '../data/load';
import type { EmbeddingsMeta } from '../data/types';
import { buildIndex, type SemanticIndex } from './verseIndex';

let cached: Promise<SemanticIndex> | null = null;

/** Clears the cache. For tests. */
export function resetSemanticIndex(): void {
  cached = null;
}

async function fetchOk(file: string): Promise<Response> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`Could not load ${file}: HTTP ${res.status} ${res.statusText}`);
  return res;
}

async function load(): Promise<SemanticIndex> {
  const [meta, buf, occurrences] = await Promise.all([
    fetchOk('embeddings.json').then((r) => r.json() as Promise<EmbeddingsMeta>),
    fetchOk('embeddings.bin').then((r) => r.arrayBuffer()),
    loadOccurrences(),
  ]);
  return buildIndex(meta, new Int8Array(buf), occurrences);
}

/** Loads embeddings.json + embeddings.bin + occurrences and builds the index (once). */
export function loadSemanticIndex(): Promise<SemanticIndex> {
  if (!cached) {
    cached = load();
    // Forget a failed load so a later call can retry.
    cached.catch(() => (cached = null));
  }
  return cached;
}
