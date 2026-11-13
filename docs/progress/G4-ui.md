# G4: UI and data loading

## Done
- `src/data/load.ts`: `loadGalaxy`, `loadOccurrences`, `loadVerses`. One shared promise per file. A failed load clears its cache entry, so a later call retries. HTTP errors name the file and status. `?fixture` in the URL serves the fixture data for all three.
- `src/data/useLoadGalaxy.ts`: loads the galaxy into the store. Errors go to `useLoadError` (`src/ui/loadError.ts`).
- `src/ui/useRootDetails.ts`: lazy load of occurrences and verses on the first selection. Returns `{ status, occurrences, verses, error }`.
- `src/ui/search.ts`: Arabic normalization (diacritics, Quranic marks, tatweel, all alef/hamza forms to `ا`, `ى` to `ي`) and transliteration normalization (NFD, no hyphens, no ʾ/ʿ, lowercase). Ranking: exact (root or lemma), then root prefix, then substring; ties by `count`. Max 8 results.
- `src/ui/SearchBox.tsx`: ARIA combobox. Arrow keys, Enter, Escape.
- `src/ui/RootPanel.tsx` and `VerseList.tsx`: root, counts, lemma chips, connected roots (by edge weight), verse list with highlighted words, 30 verses per page. Close button and Escape.
- `src/ui/HoverHint.tsx`, `src/ui/About.tsx`, `src/ui/Overlay.tsx` (loading and error screens).
- `src/ui/useHashSync.ts`: `#/root/<arabic>` deep link, history entry per selection, back/forward.
- Styles in `src/styles.css`. Fonts: Amiri Quran and Noto Naskh Arabic from Google Fonts in `index.html`.

## Decisions
- UI-only state (load error) lives in a small Zustand store in `src/ui/loadError.ts`, not in the shared store.
- Detail data loading lives in `useRootDetails` local state; the files are cached in `load.ts`.
- The hash uses `history.pushState`, so the hook gets no `hashchange` feedback from its own writes.
- Search Escape stops propagation, so it clears the query without closing the panel.
- The hover hint sits at the bottom centre (the store has no pointer position). It hides for the selected root.
- On phones (max-width 720px) the panel is a bottom sheet (62vh) and the about box moves to the bottom.
- Lemma search is Arabic only; the data has no lemma transliteration.

## Open issues
- The fixture module is bundled into production because `load.ts` imports it for `?fixture` (about 2 KB).
- Not checked in a real browser yet; behaviour is covered by Vitest + RTL tests only.
- The scene goal should call `hover(null)` on pointer leave, or the hint stays visible.
