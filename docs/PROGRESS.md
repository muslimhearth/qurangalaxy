# Progress

| Goal | Branch | Status |
|---|---|---|
| G0 Scaffold, contract, docs | main | Done |
| G1 Data pipeline | merged | Done: 1,651 roots, 11,743 edges, 6,236 verses |
| G2 Layout and clusters | merged | Done: 10 clusters, layout in ~6 s |
| G3 3D scene | merged | Done: WebGPU + WebGL 2 fallback, 60 fps |
| G4 UI and data loading | merged | Done: search, root panel, deep links |
| G5 Integration, E2E, polish | main | Done: 186 unit + 28 browser tests (desktop, Android, iPhone) |
| G6 Polish | main | Done: label declutter, panel-aware camera, hub links, fonts |
| G7 Latin spelling search ("noor" → نور) | merged | Done: 60+ terms, chat digits (3ilm), ~3 ms per query |
| G8 English meanings (Wiktionary + translation fallback) | merged | Done: 90% of Quran words via Wiktionary, 4.5% fallback |
| G9 Semantic search + exact↔meaning slider | merged | Done: MiniLM in a worker, hit@5 94% on 35 phrases |
| G10 Corpus word-by-word glosses (local evaluation only) | agent worktree | In progress |
| G11 Hint of «القرآن الكريم» in the galaxy intro | merged | Done: faint calligraphy dust + partial star pull, skips on deep link / reduced motion / input |
| Deploy | main | Live at https://quranic.space (Caddy, `pnpm ship`) |

Per-goal detail: `docs/progress/`.

## Main-session decisions
- `Occurrence.w` holds Tanzil word positions, not corpus numbers. In 4 verses (2:181, 8:6, 13:37, 37:130) the corpus joins two Tanzil words into one; `scripts/lib/wordmap.ts` maps them and the build stops on any unknown mismatch.
- Tanzil copyright notice ships as `public/data/NOTICE.txt` (JSON cannot hold comments).

- Real-data clusters checked: sizes 408 to 18, grouped by theme (e.g. hearing/sight/heart; paradise/rivers/food). No tuning needed.

- G5 fixes found by browser tests: Escape could not close the panel after a search; the title bar showed through the glassy bottom sheet on phones.

- G6 polish (from screenshot review):
  - Labels: up to 80 frequent roots plus 30 neighbors per focus are candidates; a greedy screen-space pass (`declutter`) shows only labels that do not collide, in priority order, and none under the panel.
  - Camera: the view shifts (`camera.setViewOffset`) to center the free area beside the side panel or above the bottom sheet, and the fly-to frames the root with all its neighbors.
  - Hub roots (أله has 1,087 links): their links fade by 8/sqrt(n) so the additive lines do not merge into white.
  - Connected roots: the 12 strongest first, "Show all" for the rest.
  - Fonts: Amiri Quran and Noto Naskh Arabic are self-hosted (Fontsource, OFL); no Google Fonts requests. The root heading has bottom padding for Amiri's deep tails (م, ن).

- Search goals (G7–G9) share one contract made on main first: `Root.en`, `Lemma.en`, `EmbeddingsMeta`, `semanticWeight` in the store, and `src/search/` (scored `Match`es from pluggable matchers). Each goal adds a matcher with a one-line change.
- Corpus word-by-word English glosses are not used: no download file, a "research, non-commercial" clause next to GPL, and part of the glosses comes from Shaikh & Khatri. The user is asking the corpus team; the glosses can be added as a second source later.

- Main fixes after merging G7 + G8: English meanings outrank accidental Latin spellings ("sea" → بحر, not ساءَ); an exact lemma meaning beats a root phrase that only contains the word; earlier meanings beat later ones.
- Main UX fixes from user testing: touchpad pinch/swipe, rotation from start (3 s pause after interaction), camera pivots on the selected root and zooms toward the pointer, phone sheet minimizes.
- Deploy: static files in `~tux/qurangalaxy/web` on the server, Caddy site block in `deploy/Caddyfile.site` (strict CSP; everything self-hosted). `pnpm ship` fetches the model, builds and rsyncs.

## Known issues
- R3F still bundles three's `WebGLRenderer` (unused) and logs two library deprecation warnings (`THREE.Clock`, `PCFSoftShadowMap`). These come from the library and go away when R3F updates.
- Some Wiktionary senses are wrong or rare (ربب "many a man", شُحُوم "gagea reticulata"); 1,417 lemmas (5.4% of words) have no meaning. See `docs/progress/g8.md`.
- Meaning search matches the English translation, so it misses words the translation does not use ("pilgrimage" vs "Hajj").
- Headless software rendering is slow: under parallel load some browser tests need generous timeouts.
- Hub roots still show a bright core where hundreds of links meet. This is expected for additive lines.
