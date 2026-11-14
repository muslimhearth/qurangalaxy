# G24: Typo tolerance in Verses search

## Done
- **Matcher** (`src/verses/typos.ts`): Damerau-Levenshtein distance (optimal string alignment: change, add, drop, swap of two neighbours).
  - Edits allowed per query word: 1–3 letters none, 4–6 letters 1, 7+ letters 2 (`maxEdits`).
  - English compares whole words, and also stems (with the stem's own limit).
  - Transliteration uses approximate substring matching, because Tanzil glues prefixes and endings to words. Example: "rahmah" matches "rahmat" inside "rahmatan".
  - Substring matching is bit-parallel (Myers 1999 with Hyyrö's 2003 swap term), 32-bit, for words up to 32 letters. A plain table method is the fallback and the test reference (3,000 random pairs agree).
  - Fast pre-check: a letter bit set per vocabulary word (`letterMask`). A word that lacks more query letters than the allowed edits is skipped.
- **Scores** (`TYPO_SCORE`): 1 edit = 0.6, 2 edits = 0.45. The weakest exact match is 0.8, so a typo never outranks a real match of the same word. Typo scores apply only when the exact score is 0.
- **Search** (`src/verses/exact.ts`): `exactVerseMatches(index, query, limit, typos)`. The index keeps the distinct vocabulary (built once) and caches one match row per query word (key: typos flag + word, at most 500 rows per language). Row building now uses a plain loop (`Float32Array.from` with a map function was several times slower). English plural check no longer makes a new string per word.
- **Marks** (`src/verses/highlight.ts`): `markedSnippet(..., typos)` marks typo matches like other matches.
- **Setting** (`src/ui/typos.ts`): `useTypos` store, key `qrg.typos.v1`, default on, blocked storage counts as on. Row "Typo tolerance" in the search settings popover (Search section). `useVerseResults` and `VerseOption` read the store, so no protected file and no `SearchBox` change.

## Timing
Fresh 3-word query (no cached rows) on the full data, Node, best of 7, machine under load (load average ~19):
- Typos on: 9–15 ms. Typos off: 6–8 ms.
- With cached rows (typing more of the same query): 3–6 ms.

## Tests
- `src/verses/typos.test.ts`: limits, distance, substring distance, bit method = table method, scores, short words.
- `src/verses/typos.data.test.ts` (real data): "rahmah" → 3:8 (transliteration); off → nothing. "patiance" → patience verses. "mohamad" → 47:2 and 48:29. "rahma", "patience", "mercy": exact results unchanged and first. Phrases keep their top 20. "god", "day": unchanged.
- `src/verses/highlight.test.ts`, `src/ui/typos.test.ts`, `src/ui/SearchSettings.test.tsx`: marks, store, switch.
- `e2e/verse-search.spec.ts`: "rahmah" shows 3:8 with "rahmatan" marked; the switch off removes it (desktop + android).

## Decisions
- Multi-word queries: a verse with one exact word and one typo word can rank above a verse with only the exact word (more words found). One-word queries keep all exact matches first.
- The setting applies to Verses mode only. Roots search is unchanged.

## Open issues
- Typos add many weak results for 4–6 letter transliteration words (e.g. "rahmah" also finds "rahman" verses). They rank below exact matches.
- E2E on desktop is flaky on a busy machine: clicks wait for a still frame of the 3D scene. The new test uses the keyboard on desktop for the switch. Some old tests in the spec time out the same way under heavy load.
