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
| `src/ui/*`, `src/data/load.ts`, `src/data/useLoadGalaxy.ts` | G4 ui | Data loading, search, panels, URL state |

## Key decisions
- **Precomputed layout.** The force layout runs at build time, so the app starts instantly and looks the same for every user.
- **Lazy detail data.** Only `galaxy.json` loads at startup. Verses and occurrences load on first selection.
- **WebGPU first.** three.js `WebGPURenderer` falls back to WebGL 2 automatically.
- **One store.** Scene and UI talk only through the Zustand store.
