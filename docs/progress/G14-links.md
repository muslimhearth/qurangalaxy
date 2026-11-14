# G14: meaningful links

## Done
- **Link score.** `Edge.score` (new field in `src/data/types.ts`, approved for this goal):
  `score = lift × log2(1 + shared)`, with `lift = shared · N / (versesA · versesB)` and N = 6,236 verses.
  Lift says how many times more often two roots share a verse than two random roots of the same sizes.
  Scores keep 3 significant digits.
- **Links in galaxy.json** (`scripts/lib/edges.ts`, `buildEdges`): a link needs at least 2 shared verses
  (`MIN_SHARED`). Each root keeps its top 8 links by score; the file holds the union (4,967 edges, was 11,743).
- **Star positions unchanged.** `buildEdges` also returns the old edge set (each root's top 8 by raw weight,
  1 shared verse allowed). Only the layout step gets it. Checked: all 1,651 `pos` and `cluster` values and
  `clusterCount` are identical to main; `occurrences.json` is byte-identical.
- **Every ranking uses score**: focus ring order, bright top 20, link brightness (`linkScoreLevel`),
  "Connected roots" order (`src/ui/helpers.ts`), labels. Ties go by word count, as before.
  The chip still shows the shared-verse count. Its title: "s-d-s: 2 shared verses, 148× more often than chance" (on the سدس chip of وصي)
  (lift = score / log2(1 + shared)).
- **Panel note** under "Connected roots": "Roots that appear with وصي more than chance".
- **Shared verses.** Each connected-root chip has two buttons: the name selects the root, the count opens
  the verses both roots share, inside the "Connected roots" section (a second tap or × closes it).
  The selected root's words are gold, the other root's words are blue (`mark.alt`).
  Data comes from `occurrences.json` and `verses.json` through the cached loaders (`src/ui/sharedVerses.ts`).
  Touch screens (`pointer: coarse`) get 44 px tap targets; desktop 34 px.
- **Faint links** (past the bright top 20) now have an absolute level `FAINT_LINK = 0.18`
  (was 1.5 × the base level, about 0.03). The dimmest bright link is 0.3. Their end stars: 0.7 (was 0.4).
- **Faint-link labels** (`src/scene/edgeLabels.ts`): with a selection, every faint link gets a smaller,
  dimmer label at its far end. When the end star is outside the free area (off screen, behind the camera,
  or under the panel / search bar), the label is pinned where the line leaves the free area.
  They go through the same `declutter` step as the other labels, with the lowest priority, so they never
  hide ring labels and do not overlap each other.
- Tests: `edges`, `dataset`, `neighbors`, `helpers`, `highlight`, `edgeLabels`, `sharedVerses`, `VerseList`,
  `RootPanel`. Browser: `e2e/focus.spec.ts` (closing test now uses أمن / عمل, since قول left the ring of رحم),
  `e2e/app.spec.ts` (new shared-verses test).

## Decisions
- **Score formula.** Pure lift lets 2-verse accidents between rare roots win (for قوم: أسس, بزغ, سرمد, قسطس,
  each 2 verses). The log2(1 + shared) bonus is small (2 verses: ×1.6, 33 verses: ×5) but enough to put
  solid links first. Top 10 (shared verses, score), before = raw weight, after = score:

  | Root | Before (raw weight) | After (score) |
  |---|---|---|
  | وصي | أله 11, كون 9, ولد 7, قرب 5, قول 4, علم 4, قوم 4, أنس 4, حسن 4, شرك 4 | سدس (2, 235), نصف (2, 135), ولد (7, 78), ثني (3, 74), ثلث (3, 64), ثمن (2, 50), ترك (3, 48), ربع (2, 45), قرب (5, 42), عدل (2, 39) |
  | حكم | أله 127, علم 71, عزز 49, كون 48, بين 41, قول 34, كتب 31, ربب 30, أمن 28, أتي 26 | عزز (49, 78), لحق (3, 33), جرح (2, 26), فرض (4, 22), صيد (2, 21), علم (71, 20), كتب (31, 18), صور (4, 18), طمأن (3, 17), بين (41, 16) |
  | قوم | أله 242, قول 186, كون 131, ربب 112, يوم 104, أمن 102, أتي 83, أيي 82, علم 75, بين 67 | صرط (33, 39), صلو (52, 35), زكو (27, 24), فكر (10, 20), بور (4, 19), خزي (12, 19), فسق (21, 18), سفه (6, 18), تجر (5, 17), يوم (104, 17) |

  وصي now shows the inheritance passage (shares, heirs), حكم leads with عزيز حكيم, قوم shows "establish
  prayer, give zakat" and "a people who reflect / who are defiantly disobedient".
- **Two edge sets** instead of one: the layout must keep its input, or every star would move.
- **Data build.** The Wiktionary cache (`data/raw/wiktionary/`) is not on this machine, and `pnpm data` would
  fetch thousands of pages. So I ran `buildDataset` from the cached Quran sources without glosses, checked
  that positions, clusters and occurrences match main, and replaced only `edges` in the committed
  `galaxy.json` (roots, glosses unchanged). A full `pnpm data` with the cache gives the same edges.
- **Pinned labels** are centered on the exit point and kept 4 px inside the free area. Lines are clipped
  in clip space first, so an end behind the camera still pins on the correct side.

## Open issues
- With score-ranked top-8 links, most roots have fewer links: median 5 (was 8); only 55 roots have more
  than 20 (was 104). وصي and حكم have 14 links each, so they show no faint links at all; قوم (47) and
  أله (179) do. Raising `EDGES_PER_ROOT` for the links only (not the layout) would give more faint links.
- Faint-link labels pinned at one screen edge can crowd; the declutter step hides the overlapping ones.
- Faint labels are not tappable (the label layer ignores pointer events, as before).
- `pnpm data` was not run end to end (see Decisions).
- Under heavy machine load (2 workers) the Android sheet spec timed out once; with 1 worker all pass
  (known, see G12).
