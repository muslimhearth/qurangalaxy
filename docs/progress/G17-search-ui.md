# G17: search bar, settings and tabs redesign

## Done
- **Design.** Two options as screenshots (A: tab pills in the search row; B: tabs strip on the panel). The user chose A.
- **Top row (desktop).** Title | search bar | tab pills. The bar is up to 680 px wide and keeps 312 px on its
  right for the tabs (`--search-left`, `--search-w` on `.overlay`). On wide screens the bar is centered.
  The root and verse panels start below the row (`top: 80px`).
- **Search bar.** Search icon, field, result count, segmented "Roots | Verses" (`ModeSwitch`, class `segmented`),
  then `.search-tools`: a slot for the bookmarks button, and the gear (`SearchSettings`).
- **Result count** (`resultCount.ts`): roots "8 of 22 roots", or "22 roots" when all show; verses "12 verses",
  or "30+ verses" when the list is capped (`VERSE_LIMIT`). Narrow phones show only the numbers.
- **"Show all N roots".** Last row of the root list (an option, so arrows and Enter reach it). It expands the
  list for the current query only; a new query starts with 8 again. It stays in view while the list scrolls.
- **Settings popover.** Labels left, controls right. "Match: Exact | Hybrid | Meaning" (`MatchSwitch`, weights
  0, 0.5, 1; the existing root and verse weight stores). An old in-between weight shows as Hybrid.
  "Save search history" switch. "N recent searches · Clear history" (new `clear` action in `history.ts`).
  A comment marks the slot for the "Show meanings" switch. `SemanticSlider` is removed.
- **Escape.** In the field: leaves the field, keeps the text, closes the list. It never reaches the root panel
  while the field has focus. Next Escape (field not focused, text present): clears the text; a window
  capture listener stops it before the panels. Other fields and dialogs keep their own Escape.
- **After a pick** the field loses focus (all devices), so no list or history comes back over the galaxy.
- **Solid lists.** `.search` uses `--panel-solid` while the results or the history show. The settings
  popover is solid too.
- **History list.** Three items in view (132 px), the rest scroll.
- **Tabs.** Same `TabBar` markup, now pills. Only the pills catch the pointer. The bar shows as soon as the
  first tab has content (G16 rule), so `+` stays reachable. Phones: one row under the search bar (44 px).
- **Phones.** "Roots | Verses" is a full-width second row of the search panel, shown only while the field has
  focus. The bar row has the field, count, tools slot and gear.

## Decisions
- No change to `Overlay.tsx`: the tab bar is positioned from the same CSS variables as the search bar.
- The panel top moves down on desktop instead of placing tabs over it.
- "Show all" is a list option, not a separate button, so keyboard users reach it with the arrows.
- The gear's accessible name carries the mode: "Search settings: Hybrid".

## Open issues
- Verse total is not known past the cap (exact pool 100, meaning top 40, list 30), hence "30+".
- With many tabs on desktop the pills scroll sideways; there is no overflow menu.
- The About box, when open (348 px wide), reaches under the left end of the search bar on desktop.
- The settings popover on phones can cover the top of the bottom sheet while it is open.
- `semantic.spec.ts` is skipped without the local model files, so the Meaning switch is tested only in units.
