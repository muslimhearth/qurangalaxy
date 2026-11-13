# Progress

| Goal | Branch | Status |
|---|---|---|
| G0 Scaffold, contract, docs | main | Done |
| G1 Data pipeline | merged | Done: 1,651 roots, 11,743 edges, 6,236 verses |
| G2 Layout and clusters | worktree | In progress |
| G3 3D scene | worktree | In progress |
| G4 UI and data loading | merged | Done: search, root panel, deep links |
| G5 Integration, E2E, polish | main | Not started |

Per-goal detail: `docs/progress/`.

## Main-session decisions
- `Occurrence.w` holds Tanzil word positions, not corpus numbers. In 4 verses (2:181, 8:6, 13:37, 37:130) the corpus joins two Tanzil words into one; `scripts/lib/wordmap.ts` maps them and the build stops on any unknown mismatch.
- Tanzil copyright notice ships as `public/data/NOTICE.txt` (JSON cannot hold comments).

## Open
- Rebuild data (`pnpm data`) after G2 merges, so clusters and layout are real.
- G3 must call `hover(null)` on pointer leave and keep the canvas below the overlay (`z-index: 10`).
