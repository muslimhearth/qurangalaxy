# G21: light/dark theme, settings rows, small fixes

## Done
- **Color tokens.** Every UI color in `src/styles.css` is now a custom property on `:root`. The `:root` set is the dark look, with the same values as before. `:root[data-theme='light']` holds the light set.
- **Light theme.** Panels, search bar, lists, popovers, tab pills, bookmarks list, root and verse panels, bottom sheet, About, chips and verse text turn light. Panels are 96% opaque, so text reads well over the dark sky. Gold text turns dark amber (`#835100`). Glow text shadows are off.
- **Reader as a page.** In light theme the surah reader has a warm page background (`--reader-bg`, `#fbf5e6`) with dark text.
- **Galaxy stays dark.** `--bg` and the scene's clear color do not change. The 3D labels keep their inline colors.
- **Contrast check.** `src/theme/contrast.test.ts` reads `styles.css`. It checks WCAG AA (4.5:1) in both themes for `--fg`, `--fg-2`, `--fg-3`, `--muted` and `--accent` on the panel (over the sky), the solid panel and the reader, and for gold on the selected tint.
- **Theme store** (`src/theme/theme.ts`). The choice is `system | light | dark`, default `system`. It is saved in localStorage `qrg.theme.v1` with try/catch. `startTheme()` sets `data-theme` on `<html>` and `<meta name="theme-color">` (`#04050b` dark, `#f3ede0` light). For `system` it follows `prefers-color-scheme` live. `main.tsx` calls it before React renders.
- **No flash.** The CSP (`script-src 'self'`) blocks inline scripts. So `public/theme-init.js` is a small external classic script in `<head>`. It sets `data-theme` and the meta color before the first paint. A unit test runs it and checks the key and colors against `theme.ts`.
- **Settings popover.** New "Display" group: "Show meanings" switch (G19 `useMeanings`) and "Theme: System | Light | Dark" (`ThemeSwitch`, same segmented style as Match).
- **Tab pills.** Max width 9rem → 11rem, so "Al-Baqara 2:17" fits. Latin labels also get a `title` with the full label.
- **Reader prev/next.** The reader no longer marks verse 1 after prev/next. Local state in `SurahReader` remembers the place the buttons opened. Any other place clears it.
- **Reader bookmarks.** Each reader verse row has the G20 `BookmarkButton` star.

## Decisions
- Dark is the CSS default. A page without `data-theme` (script blocked) looks as before.
- `theme-init.js` repeats a few lines of `theme.ts`. A test keeps them in step.
- The light `theme-color` is light, even though the sky stays dark. The browser bar matches the panels.

## Tests
- Unit: 133 files, 875 tests pass. `pnpm typecheck` and `pnpm build` pass.
- E2E (desktop + android, `--workers=1`, port 5405): `theme.spec.ts` 8/8, `reader.spec.ts` + `app.spec.ts` 29 passed, 3 skipped.

## Open issues
- After browser back to a reader place that prev/next opened, verse 1 is marked again (the hash gives a new place).
- `#/surah/N` (verse 1) marks verse 1 on load.
- Light panels over the bright galaxy core look a bit grey through the blur.
- `bookmarks.spec.ts` "a verse search result opens in a new tab" fails on android, on main too: it taps "Verses" before the field has focus, and G17 hides that switch on phones until then. Not changed here.
