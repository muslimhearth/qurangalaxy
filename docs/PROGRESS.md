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

## Known issues
- R3F still bundles three's `WebGLRenderer` (unused) and logs two library deprecation warnings (`THREE.Clock`, `PCFSoftShadowMap`). These come from the library and go away when R3F updates.
- Hub roots still show a bright core where hundreds of links meet. This is expected for additive lines.
