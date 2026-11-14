# G23: tab strip (desktop) and tab counter with switcher (phones)

## Done
- **Two layouts.** `src/tabs/layout.ts`: `useTabLayout()` follows `(min-width: 900px) and (pointer: fine)`.
  Match: the pill rail (`TabBar`). No match (phones, touch tablets, windows under 900 px): the tab
  counter (`TabCounter`). No `matchMedia` (unit tests): the rail.
- **Desktop rail** (`src/tabs/TabBar.tsx`). Slim pills in one glass rail right of the search bar.
  The active pill is filled (accent soft) and shows ×. Other pills show × on hover or focus.
  The strip scrolls sideways (mouse wheel too). On every active change, tab change, first show and
  resize, the active pill scrolls fully into view, 26 px clear of the edge fades
  (`src/tabs/strip.ts`: `revealScroll`, `edgeFades`). The edges fade only on the sides with hidden pills.
  "⋯ N" shows only when pills are hidden. It opens the switcher as a popover. "+" is at the end.
  `role=tablist/tab`, arrow keys, Home/End, Delete, middle-click, Ctrl-click and long-press stay as before.
- **Search bar width.** The bar keeps 450 px for the rail (was 312 px): 4–5 pills fit at 1280 px.
  The bar takes its full width (`--search-w-full`) while in use (class `in-use`: a user focus,
  a tap or typing) or while its result or history list is open. The rail hides then
  (`visibility: hidden`) and comes back on blur. The width change has a 0.18 s transition (none
  with reduced motion). Under 900 px and on touch screens, the bar always has the full width.
- **Phone counter** (`src/tabs/TabCounter.tsx`). A rounded square with the tab count in the
  search tools, before the bookmarks star, `aria-label "Tabs (N)"`. Hidden while the only tab is
  empty (`showsTabs` in `model.ts`). A new tab (long-press) makes the number pulse once
  (reduced motion: a color flash only).
- **Search in use on phones.** The counter and the star hide while the field is in use or a
  list is open. The gear stays; Roots | Verses already sits on its own row under the field on phones.
  On blur with the list closed, they come back.
- **Switcher** (`src/tabs/TabSwitcher.tsx`). Phone: bottom sheet over a scrim. Desktop: popover
  under the rail. Header "N tabs", "+ New tab" (and × on the sheet). Rows: kind icon
  (`TabKindIcon.tsx`), label, caption (`src/tabs/caption.ts`: "Root · r-ḥ-m · mercy",
  "Reader · surah 2, verse 17", "Verse · 2:255", "Search · Roots"), × per row. The active row has
  a gold bar and a tint, has the focus and is scrolled into view on open. A pick switches and
  closes. Escape, the scrim, × or a press outside (popover) closes. The Tab key stays inside
  (`src/tabs/focusTrap.ts`).
- Removed: the phone tab row under the search bar and its offsets for the root sheet, the reader and the hover hint.
- Tests: unit tests for caption, strip math, layout hook, focus trap, `showsTabs`, switcher, counter,
  rail overflow and reveal, and the search bar `in-use` class. `e2e/tabs.spec.ts` covers both
  layouts; `e2e/tabHelpers.ts` gives `tabNames`, `switchTab`, `newTab`, `closeTab` for both.
  `bookmarks.spec.ts` and `reader.spec.ts` use them.

## Decisions
- **"In use", not ":focus".** On desktop the field gets the focus on load. With a `:focus` rule the
  rail would never show. So the bar widens on a user focus, a tap in the field, typing or an open list.
- **Reveal margin = fade width.** A pill under the fade looks cut, so "fully in view" means clear of the fade.
- **"⋯ N" shows the total count**, as in the mockup, not the hidden count.
- No change to protected files.

## Open issues
- At 900–1000 px the rail has room for about one pill, and the search input is short (the bar
  keeps its 360 px minimum, as before G23). A higher strip breakpoint (about 1024 px) would help.
- "⋯ N" can stay after closing tabs when the pills would fit only without it (the rail then
  still hides pills, so the button stays useful).
- Touch screens 900 px and wider (tablets) get the counter. The bar there has the full width.
- Under software WebGL every Playwright tap waits about 6 s for frames. The phone helpers in
  `e2e/tabHelpers.ts` send click events; the sheet test keeps real taps (`test.slow()`).
