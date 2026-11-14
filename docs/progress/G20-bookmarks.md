# G20: bookmarks and new tabs for verses

## Done
- `src/tabs/target.ts`: a tab target is `{ root }` or `{ verse }`. `toTarget` (a bare number is a root), `targetView`, `showTarget` (open in the current tab).
- `openInNewTab(target, activate)` and `useNewTabGesture` take a target or a bare root id. Old calls with a root id still work.
- New-tab gesture added to: verse search results (SearchBox: one `target` field per option and the existing spread), root chips in the verse panel, bookmark rows. Connected-root chips and root search results had it already.
- Long-press fix: a finger lift after the hold time opens the tab even when the timer has not run yet (busy main thread). Before, the lift could cancel a due timer.
- `src/bookmarks/model.ts`: pure functions: toggle (newest first), remove, has, `readBookmarks` (validates stored data, drops repeats, sorts, caps at 1000).
- `src/bookmarks/store.ts`: own zustand store. Saved to localStorage `qrg.bookmarks.v1` in try/catch.
- `src/bookmarks/BookmarkButton.tsx`: star toggle (`aria-pressed`, label "Bookmark رحم" / "Bookmark verse 2:255"). Mounted once each in the root panel header, the verse panel header and each verse row (`VerseList`).
- `src/bookmarks/BookmarksButton.tsx` + `BookmarksList.tsx`: star button that opens the list. Desktop: popover under the button. Phones (≤720px): bottom sheet. Roots show Arabic + first meaning; verses show key + English snippet. Tap opens in the current tab and closes the list; middle-click / Ctrl-click opens a background tab (list stays open); long-press opens a new tab, switches, and closes the list. × removes.
- Mounted in `SearchBox` after `SearchSettings` (one line). The main session moves it into G17's slot left of the gear.
- `e2e/bookmarks.spec.ts`: bookmark a root and a verse, list order, tap opens, new tab (middle-click / long-press), reload keeps them, remove; verse search result in a new tab.

## Decisions
- **One target type for tabs and bookmarks.** A bookmark is a `TabTarget` plus a time. The list rows reuse the new-tab gesture without extra code.
- **New verse tab = `{ openVerse }` only.** No root selected, so the tab label is the verse key.
- **Popover in a portal (`document.body`).** `.search` has a `transform`, which breaks `position: fixed` for its children. The portal lets the same element be a popover (desktop, placed from the button's rect) or a bottom sheet (phone, CSS only).
- **List closes on a tab switch.** That is how a long-press closes it; a background tab keeps it open, so the user can open several.
- **Row stars:** mouse: hidden until hover or focus, always shown once set. Touch: always shown, faint, 44px target at the row's top right.
- No change to protected files.

## Open issues
- The verse row star sits at the top right of the row (absolute). Its 44px touch target overlaps the right end of the Arabic first line by about 16px. A flex key row would fix it, but G19 edits `VerseList` now.
- Under heavy CPU load (other agents, software WebGL) e2e screenshots and long-press timers can time out; run e2e with `--workers=1`.
- Stars in the 3D scene still have no new-tab gesture (G16 open issue).
