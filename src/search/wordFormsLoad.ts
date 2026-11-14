/** Lazy loading of public/data/wordforms.json: fetched on the first Arabic query only. */
import { fixtureOccurrences, fixtureVerses } from '../data/fixture';
import { isFixtureMode } from '../data/load';
import { buildWordForms, indexWordForms, type WordFormIndex, type WordFormsFile } from './wordForms';

let loaded: WordFormIndex | null = null;
let pending: Promise<WordFormIndex> | null = null;

/** The word-form index once loaded, else null. Matchers read it synchronously. */
export function currentWordForms(): WordFormIndex | null {
  return loaded;
}

/** Sets or clears the loaded index. For tests. */
export function setWordForms(index: WordFormIndex | null): void {
  loaded = index;
  pending = null;
}

async function fetchWordForms(): Promise<WordFormIndex> {
  if (isFixtureMode()) return indexWordForms(buildWordForms(fixtureVerses, fixtureOccurrences));
  const res = await fetch(`${import.meta.env.BASE_URL}data/wordforms.json`);
  if (!res.ok) throw new Error(`Could not load wordforms.json: HTTP ${res.status} ${res.statusText}`);
  return indexWordForms((await res.json()) as WordFormsFile);
}

/** Loads wordforms.json once (shared); a failed load can be retried. */
export function loadWordForms(): Promise<WordFormIndex> {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = fetchWordForms().then((index) => (loaded = index));
    pending.catch(() => (pending = null));
  }
  return pending;
}
