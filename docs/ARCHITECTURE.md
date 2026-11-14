# Architecture

## Overview
Two halves joined by a JSON data contract (`src/data/types.ts`):

1. **Build pipeline** (`scripts/`, Node + tsx). Runs offline. Reads raw sources and writes `public/data/`.
2. **Web app** (`src/`, React 19 + react-three-fiber + three.js WebGPU). Static site. Reads `public/data/`.

```
Tanzil text ─┐                                   ┌─ galaxy.json      (startup)
Translation ─┼─> parse ─> aggregate ─> layout ───┼─ occurrences.json (lazy)
Corpus morph ┘                                   └─ verses.json      (lazy)
                                                        │
                       App: store (Zustand) <── load ───┘
                         ├─ GalaxyScene (3D stars, links, camera)
                         └─ Overlay (search, root panel, verses)
```

## Data sources
| Source | Use | License |
|---|---|---|
| Quranic Arabic Corpus morphology v0.4 (GitHub mirror `mustafa0x/quran-morphology`) | Root and lemma per word | GPL |
| Tanzil Uthmani text | Arabic verse text | Tanzil terms: verbatim copy with attribution |
| Tanzil Saheeh International translation | English verse text | Tanzil translation terms |

Raw downloads are cached in `data/raw/` (gitignored). Generated JSON in `public/data/` is committed.

## Modules
| Path | Owner goal | Job |
|---|---|---|
| `src/data/types.ts` | main | Data contract |
| `src/data/fixture.ts` | main | Small test dataset |
| `src/state/store.ts` | main | Shared state: galaxy, selection, hover, query |
| `scripts/lib/*`, `scripts/build-data.ts` | G1 data | Fetch, parse, aggregate, write JSON |
| `scripts/lib/layout.ts` | G2 layout | 3D force layout + clusters |
| `src/scene/*` | G3 scene | 3D rendering and picking |
| `src/ui/*`, `src/data/load.ts`, `src/data/useLoadGalaxy.ts` | G4 ui | Data loading, search box, panels, URL state |
| `src/search/types.ts`, `exact.ts`, `matchers.ts` | main | Search contract: a `Matcher` returns scored `Match`es (0..1); `exactMatches` keeps the best per root |
| `src/search/basic.ts` | main | Arabic letters and lemmas, Latin root letters |
| `src/search/spelling.ts` | G7 | Latin spelling ("noor", "3ilm") → cheapest Arabic spelling of each lemma, vowels checked against diacritics |
| `scripts/lib/glosses/*`, `scripts/fetch-glosses.ts`, `src/search/english.ts` | G8 | English meanings from Wiktionary (cached) with a translation fallback; English search |
| `src/semantic/*`, `src/search/blend.ts`, `scripts/models.ts`, `scripts/build-embeddings.ts`, `scripts/eval-semantic.ts` | G9 | Meaning search: worker, int8 cosine search, verse→root scores, blend |
| `src/scene/focus/*`, `src/scene/drawnEdges.ts` | G12 | Focus view: ring plan for the 20 strongest neighbors, glide, one position source for stars, links, labels and picking; selection-only link drawing |
| `src/scene/intro/*` | G11 + main | Opening: stars start in a small core and spread to their places with an ease-in (inner first). Skips: deep link, reduced motion, `?nointro`, automated browsers (`?intro` forces it) |
| `scripts/lib/edges.ts`, `src/ui/ConnectedRoots.tsx`, `src/ui/sharedVerses.ts`, `src/scene/edgeLabels.ts` | G14 | Link score vs chance, shared verses of two roots, faint-link labels at the far end or screen edge |
| `src/verses/*`, `src/history/*`, `src/ui/VersePanel.tsx`, `scripts/build-translit.ts` | G15 | Verse search (exact English/transliteration + meaning), verse keys and `#/verse/` hash, search history |
| `src/search/arabicKey.ts`, `src/search/wordForms.ts`, `scripts/*wordforms*` | G18 | One search key for Uthmani and typed Arabic; lazy word-form → root index |
| `src/reader/*`, `src/data/lemmaIndex.ts`, `src/ui/meanings.tsx`, `scripts/build-reader-data.ts` | G19 | Surah reader (`reader` in the store, `#/surah/s/v`), lazy lemma index for the word filter, Show meanings setting |
| `src/bookmarks/*`, `src/tabs/target.ts` | G20 | Bookmarks (localStorage) and tab targets (root or verse) |
| `src/tabs/*` | G16 | In-app tabs: pure model, own store with localStorage, sync with the main store, tab bar, new-tab gesture |
| `scripts/corpus-wbw.ts`, `scripts/corpus-glosses.ts`, `scripts/lib/corpus-wbw/*` | G10 | Polite, resumable scraper of the corpus word-by-word glosses; per-lemma/root aggregation; `loadCorpusGlosses` hook (not wired into the data build) |
| `deploy/Caddyfile.site`, `scripts/ship.sh` | main | Deploy |

## Testing
| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest + Testing Library (jsdom) | Parsers, aggregation, layout, scene helpers, UI components |
| End to end | Playwright | Real data in real browsers: the scene draws (lit-pixel check), search, highlights, deep links, layout per screen size, touch |

Playwright projects: `desktop` (Chromium 1280×720), `android` (Pixel 7), `iphone` (iPhone 15, WebKit).
WebKit's Linux build needs Ubuntu libraries, so `pnpm test:e2e:iphone` runs it in `mcr.microsoft.com/playwright:v1.65.0-noble`.
Headless browsers have no GPU: Chromium and WebKit run the WebGL 2 fallback in software, so the first frame can take seconds; tests poll instead of using fixed waits.

## Key decisions
- **Search = scored matchers + blend.** Each matcher (Arabic, root letters, Latin spelling, English) returns scores in 0..1; the best per root wins. Real English meanings outrank accidental Latin spellings. The slider blends: `w × semantic + (1 − w) × exact`.
- **Meaning search off the main thread.** all-MiniLM-L6-v2 (q8) runs in a Web Worker through transformers.js and loads only when the slider leaves 0. The model, the ONNX runtime wasm and the verse vectors (int8, 2.4 MB) are self-hosted. Root score = sum of the similarities of the top 20 verses × inverse verse frequency.
- **English meanings from Wiktionary.** Lemmas are matched to entries by root, letters, vowels and word class; the translation only chooses between candidate senses. Fallback: distinctive translation words.
- **Precomputed layout.** The force layout runs at build time, so the app starts instantly and looks the same for every user.
- **Lazy detail data.** Only `galaxy.json` loads at startup. Verses and occurrences load on first selection.
- **WebGPU first.** three.js `WebGPURenderer` falls back to WebGL 2 automatically.
- **One store.** Scene and UI talk only through the Zustand store.
- **Links ranked against chance.** `Edge.score` = lift × log2(1 + shared). It ranks the ring, the bright 20 and the chips; the raw count is still shown. The layout keeps its own raw-weight edges, so positions are stable.
- **Lazy data.** `wordforms.json` loads on the first Arabic query, `lemmas.json` on the first lemma tap, `translit.json` in Verses mode.
- **Search modes.** `searchMode` in the store: roots or verses. `openVerse` shows the verse panel in place of the root panel.
- **Tabs outside the main store.** `src/tabs` saves and restores `selectedId`, `query`, `searchMode` and `openVerse` per tab.
- **Lazy 3D chunk.** `App` loads `GalaxyScene` with `React.lazy`: the UI (74 kB gzip) paints first, three.js (461 kB gzip) follows.
- **Focus ring.** On selection the 20 strongest neighbors glide (1.2 s) into an oval ring sized in screen pixels for the free area; `Glide.positions` is the single source for star matrices, link ends, labels and tap picking. Only the top 20 links are bright; the rest are faint and labelled.
- **Labels without overlap.** Each frame, `LabelTracker` projects the candidate labels and `declutter` keeps them greedily in priority order (selection, hover, neighbors, frequent roots). It also skips the screen area under the root panel.
- **Panel-aware camera.** `usePanelInset` measures the root panel. `viewFrame` turns that into a view offset and a smaller field of view, so the selection is framed in the free area.
- **Self-hosted fonts.** Amiri Quran (verses) and Noto Naskh Arabic (labels) ship with the app through Fontsource: no third-party requests.
- **Tanzil word positions.** `Occurrence.w` indexes `Verse.ar` split on spaces; `scripts/lib/wordmap.ts` maps the 4 verses where the corpus joins two Tanzil words.
