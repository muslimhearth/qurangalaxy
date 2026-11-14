# G19: Surah reader, lemma filter, meanings toggle

## Done
- **Chip title.** A connected-root chip shows the root's meaning: transliteration and the first two English meanings (`s-m-w · name, sky`). The old "N shared verses, X× more often than chance" text is gone. The count button keeps its aria-label ("Show the N verses shared with …").
- **Lemma filter.** "Words from this root" chips are toggle buttons (`aria-pressed`). A tap filters the verse list to verses with that lemma. Only that lemma's words are gold. A second tap, another chip, or the × button ("Show all verses") changes or clears the filter. A line above the list says "N verses with <lemma>". The filter is kept per root.
- **Surah reader** (`src/reader/`). A tap on any verse key (root verses, shared verses, verse panel title) opens the full surah at that verse.
  - Takes the panel's place. Phones: a tall bottom sheet that can minimize.
  - Header: back button, surah number, Arabic name, Tanzil transliterated and English name, verse count. A row below has previous/next surah buttons.
  - Verses: key, Arabic, English (if on). The open verse is marked (`aria-current`) and scrolled into view. Words of the selected root stay gold.
  - Back or Escape closes the reader. The panel under it stays mounted but hidden, so its scroll, lemma filter and "show more" survive. The verse list then flashes the verse again.
  - Deep link `#/surah/2/17` (`#/surah/2` opens verse 1). `#/root/` and `#/verse/` still work. Back/forward opens and closes the reader. The reader wins over the verse panel, which wins over the root.
  - Tabs save and restore `reader`. Tab label: `Al-Baqara 2:17` (Latin script).
  - Long surahs: the reader renders 30 verses around the open verse first, then 80 more on each side per idle moment (`requestIdleCallback`). It keeps the reading position itself when verses are added above (`overflow-anchor: none`). Verses also use `content-visibility: auto`. In headless Chromium the click-to-render time for a 200–286 verse surah fell from 0.5–1.9 s to 50–110 ms.
- **Show meanings.** `useMeanings` store (`src/ui/meanings.tsx`), on by default, saved in localStorage under `qrg.showMeanings.v1` with try/catch. It hides the English text in the root verse list, shared verses, verse panel and reader. An "EN" toggle (`MeaningsToggle`) sits in the root panel's "Verses" header, the verse panel header and the reader header. Both the store and the toggle are exported, so the settings popover (G17) can add a row.
- **Escape bug.** Cause: the root panel's Escape handler only cleared the selection. Search text left in the field (typed, then a root picked with a star or a chip) stayed in the tab, so the tab showed `“أحد”`. Fix: Escape in the root panel also clears the search text. The tab is then empty ("New tab") and the bar hides. Inside the search field the first Escape still only clears the text. Test: `RootPanel.test.tsx` "Escape also clears leftover search text".
- **Extension points for G20.** `VerseList` takes `actions?: (key) => ReactNode`, which renders after the key in a `.verse-head` row. The panel headers keep their `.head-buttons` row.

## Data decisions
- **Lemma per word.** `occurrences.json` has word positions but no lemma. `public/data/lemmas.json` (102 KB, 14 KB gzip) adds it. Row i belongs to root i: the index in `Root.lemmas` of each word of `occurrences[i]`, flattened in occurrence order. Type and filter: `src/data/lemmaIndex.ts` (not in `types.ts`). It loads lazily on the first chip tap (`loadLemmaIndex`). A word with two segments of the same root keeps the first segment's lemma, as `aggregateRoots` does.
- **Surah names.** Source: Tanzil Quran Metadata 1.0 (`https://tanzil.net/res/text/metadata/quran-data.js`, CC BY 3.0). Saved as `src/reader/surahs.json` (8 KB), bundled so tab labels work without a fetch. Names are Tanzil's (`Al-Baqara`, not `Al-Baqarah`). Credited in `public/data/NOTICE.txt` items 6 and 7.
- Build: `pnpm data:reader` (`scripts/build-reader-data.ts`). It reads the cached morphology, `galaxy.json` and `occurrences.json`. It does not run the full data build.

## Tests
- Unit: 118 files, 749 tests pass (`pnpm test`). `pnpm typecheck` and `pnpm build` pass.
- E2E (desktop + android, `--workers=1` because the machine was busy): `e2e/reader.spec.ts` (reader from a root, prev/next, back, browser back/forward, deep link, meanings toggle kept after reload, lemma filter, Escape order) 7/7. `app.spec.ts` + `tabs.spec.ts` pass.
- `tabs.spec.ts` long-press: the hold is now 2.5 s, not 1.5 s. In software rendering the first paint of the verse list is one long task of about 1.2 s. It delayed the 500 ms long-press timer past 1.5 s, so the test failed in this branch every time.

## Open issues
- The camera inset (`usePanelInset`) measures the panel once per selection. With the reader open on a phone, the framing can use the old panel height.
- The reader marks verse 1 as "current" after prev/next.
- `ARCHITECTURE.md` needs rows for `src/reader/*`, `lemmas.json` and the `reader` tab field (main session).
