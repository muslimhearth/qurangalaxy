# G22: text size, tabs keep the galaxy view, search keeps root text, reader header, surah search

## Done
- **Text size.** Settings popover, Display group: "Text size S | M | L | XL" (default M).
  `src/theme/textSize.ts` (store, `qrg.textSize.v1` in localStorage, try/catch) sets
  `<html data-text-size>`. `public/theme-init.js` sets it before the first paint, so nothing jumps.
  The CSS turns it into `--ar-scale` / `--en-scale`. They scale verse text only: the root verse list,
  shared verses, the verse panel, the surah reader and verse search results. Buttons, chips and labels
  keep their size. Arabic steps: 0.86 / 1 / 1.22 / 1.45. English steps: 0.92 / 1 / 1.1 / 1.22.
- **Tabs keep the galaxy view.** `src/tabs/poses.ts` keeps one pose per tab: camera end position and
  target, the view direction of the focus ring, and the "Back to" state. `CameraRig` saves the active
  tab's pose each frame. On a tab switch with a saved pose, it calls `setLookAt(..., false)`, lays out
  the ring with `Glide.setTargets(..., instant = true)` (the stars jump to their end state) and skips
  the fly-to while the selection and recenter tick stay the same. A tab with no saved pose (a new
  background tab) flies to its root as before. "Back to" comes back and still flies. Idle rotation
  restarts from the switch time.
- **Roots search keeps its text.** After a root pick, the text stays, the list closes and the field
  blurs. Focus shows the same results again. Escape and × still clear the text. History records once.
- **Reader header.** The number is a round badge. It sits on one line with the Arabic name, both
  centered. The Arabic has a fixed line box (1.35) with top padding, so it no longer crowds the
  "An-Nahl · The Bee · 128 verses" line. Checked on a phone in light and dark, at M and XL.
- **Surah name search.** `src/reader/surahSearch.ts` matches the transliterated name (any case,
  article optional, hyphens, apostrophes and doubled letters ignored, "oo"→u, "ee"→i, final "ah"),
  the English name ("cow", "the cow"), the Arabic name (G18 `arabicKey`, "ال" optional), and
  "surah N" / "sura N" / "surat …". A name start needs 3 or more letters. There are at most 3
  "Surah" rows. They show at the top of the list in both modes. Picking a row calls `openSurah(n)`
  (`src/reader/openSurah.ts`): the reader opens at verse 1 with no mark, and the pick goes into
  the history.

## Decisions
- Enter takes the first root or verse by default, not the surah row above it. Without this,
  "rahma", "noor" or "رحم" with Enter would open a surah, not the root. ArrowUp or a tap reaches the
  surah row. With no other results, Enter opens the surah.
- Poses stay in memory only. After a reload, a tab flies to its root as before.
- Dev-only test hook `window.__qrgCamera()` (behind `import.meta.env.DEV`, so production builds drop it).

## Open issues
- A restored tab does not reframe when the window is resized, until the selection changes or the
  user presses "Back to".
- The English meaning match can put a surah row above roots for common words ("light", "sun").
