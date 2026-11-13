import type { Galaxy, Occurrences, Verses } from './types';
import { fixtureGalaxy, fixtureOccurrences, fixtureVerses } from './fixture';

/** True when the page URL has `?fixture`: a dev aid that swaps real data for the fixture. */
export function isFixtureMode(): boolean {
  return new URLSearchParams(window.location.search).has('fixture');
}

// One shared promise per file, so each file loads at most once.
const cache = new Map<string, Promise<unknown>>();

/** Clears the loader cache. For tests. */
export function resetLoadCache(): void {
  cache.clear();
}

async function fetchJson<T>(file: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${file}: HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function loadOnce<T>(file: string, fixture: T): Promise<T> {
  if (isFixtureMode()) return Promise.resolve(fixture);
  let promise = cache.get(file) as Promise<T> | undefined;
  if (!promise) {
    promise = fetchJson<T>(file);
    // Forget a failed load so a later call can retry.
    promise.catch(() => cache.delete(file));
    cache.set(file, promise);
  }
  return promise;
}

/** Loads galaxy.json (roots, edges, clusters). */
export function loadGalaxy(): Promise<Galaxy> {
  return loadOnce('galaxy.json', fixtureGalaxy);
}

/** Loads occurrences.json (verse positions per root). */
export function loadOccurrences(): Promise<Occurrences> {
  return loadOnce('occurrences.json', fixtureOccurrences);
}

/** Loads verses.json (Arabic text and English translation per verse). */
export function loadVerses(): Promise<Verses> {
  return loadOnce('verses.json', fixtureVerses);
}
