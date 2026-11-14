# G15: verse search, search history, settings, auto focus

## Done
- **Data.** `pnpm data:translit` (`scripts/build-translit.ts`, `scripts/lib/translit.ts`) downloads Tanzil's
  English transliteration (`en.transliteration`) into `data/raw/` and writes `public/data/translit.json`
  (verse key → text, 1 MB, about 250 kB gzip). The text is verbatim, Tanzil markup included. It loads lazily, only
  in verse mode or when a verse panel opens. `verses.json` and `src/data/types.ts` are unchanged.
- **Mode switch.** "Roots | Verses" radio switch in the search row (`ModeSwitch`). Buttons are 44 px tall.
  Roots mode works as before.
- **Verse search** (`src/verses/*`, `useVerseResults`):
  - Exact: query words against the English and the transliteration (`exact.ts`, `terms.ts`). English: whole word,
    plural, light stem ("patience" ~ "patient"), word start; stop words are ignored. Transliteration: apostrophes and
    doubled letters are folded ("alrrahmani" = "alrahmani"); words of 4+ letters also match inside a word
    ("rahman" in "alrrahmani"). A whole phrase in order gets a bonus. Each query word is scored once per distinct
    word (vocabulary), so a search over 6,236 verses takes about 5-60 ms.
  - Semantic: `searchVerses` on the existing semantic service (same worker, same int8 embeddings) returns the
    top 40 verses. `useSemanticVerses` is the verse twin of `useSemanticSearch`.
  - Blend: `w × semantic (scaled to best = 1) + (1 − w) × exact`. Verse search has its own mix
    (`verseWeight.ts`, default 0.5), so meaning phrases work without touching the slider. The existing slider
    shows the mix of the current mode.
  - Results: key, English snippet cut around the first hit with the hits marked, the matched transliteration
    (when it matched), and Arabic on one line.
- **Verse panel** (`VersePanel`): Arabic, transliteration (Tanzil markup shown as styles: underline = long vowel or
  emphatic letter, faded = not spoken), English, and the verse's roots as chips (from `occurrences.json`, in word
  order). A chip closes the verse, clears the query and selects the root. It uses the root panel frame (side panel
  on desktop, bottom sheet with minimize on phones). `Overlay` shows it in place of `RootPanel` while a verse is open.
- **"s:v" in any mode** (`verseKey.ts`): "3:109", "3 109", "3 : 109", "2.255" give a "verse" result at the top of
  the list; Enter or a tap opens it. Unknown verses show a message ("No verse 1:8. Surah 1 has 7 verses.",
  "No surah 115. There are 114 surahs."). Verse counts per surah are a constant, checked against `verses.json`.
- **Deep link**: `#/verse/3:109` opens the verse panel (`verses/hash.ts`, `useHashSync`). An open verse wins over
  the selected root in the hash; closing it brings back `#/root/<ar>`. Back/forward work between both.
- **History** (`src/history/history.ts`, `HistoryList`): last 10 searches (query + mode), newest first, no
  duplicates (a repeat moves to the top). Recorded on Enter and on a picked result, not per keystroke. Shown when
  the empty field gets focus from the user; tap reruns it in its mode; × removes one. localStorage, all access in
  try/catch.
- **Settings**: the existing search settings popover (chip with the sliders icon) now also has a
  "Save search history" switch (default on). Off clears the history and stops recording. Saved in localStorage.
- **Auto focus**: desktop only (`(hover: hover) and (pointer: fine)`). On phones the focus would open the keyboard
  over the galaxy on load, so there is none. The automatic focus does not open the history list.

## Decisions
- Transliteration in its own lazy file, not in `verses.json`: the data contract stays unchanged and the
  root panel does not download 1 MB more.
- Picking a verse from a word search keeps the query (the list hides until the field is focused or typed in
  again), so the user can go back to the other results. A typed key clears the query.
- Phones: picking a verse blurs the field so the keyboard closes and the sheet shows.
- On narrow phones (≤ 480 px) the settings chip shows only its icon so the field keeps room to type.

## License notes
- Tanzil translations (both Saheeh International and the transliteration): non-commercial use only; other use
  needs permission from the translator or publisher. A site with more than three Tanzil translations must link
  to https://tanzil.net/trans/ (we use two). Recorded in `public/data/NOTICE.txt` item 5.

## Open issues
- The About panel names the transliteration as a Tanzil source.
- No prev/next verse buttons in the verse panel.
- Playwright's `locator.tap()` hangs on a root chip in the verse panel (the chip unmounts during the tap);
  the e2e test uses a real touch at the chip's position instead, which works.
- Assimilated spellings ("ar-rahman") do not match Tanzil's "alrrahmani"; meaning search often covers them.
