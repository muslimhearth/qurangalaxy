# G16: in-app tabs

## Done
- `src/tabs/model.ts`: pure tab functions (add, close, switch, update, label). A tab = `selectedId`, `query`, `searchMode`, `openVerse`.
- `src/tabs/store.ts`: own zustand store. Every change goes to localStorage (`qrg.tabs.v1`).
- `src/tabs/persist.ts`: load and save in try/catch. Broken tabs are dropped. A stale active id falls back to the first tab.
- `src/tabs/connect.ts`: syncs the tab store and the shared store in both directions. A guard stops half-applied views (new root, old query) from going into a tab.
- `src/tabs/TabBar.tsx`: `[ رحم × ][ أله × ][ + ]` under the search field. `role="tablist"`, arrow keys, Home and End, Delete closes. Middle-click on a tab closes it.
- `src/tabs/useNewTabGesture.ts`: one hook for root links. Used by the connected-root chips and the search results (one spread line in each file).
- `src/ui/Overlay.tsx`: mounts `TabBar` and `useTabSync()` (before `useHashSync()`).
- `e2e/tabs.spec.ts`: 2 roots in 2 tabs, switch, reload, close. Ctrl-click and middle-click (desktop), long-press (android).

## Decisions
- **Mouse opens in the background, touch switches.** Middle-click and Ctrl/Cmd-click keep the current tab in front, as in browsers. This lets the user open several search results in a row. A touch long-press switches to the new tab: on a phone a tab that appears off to the side gives too little feedback. Background tabs keep their opening order (browser `opener` rule).
- **Bar hidden only while the single tab is empty.** Then there is nothing to keep, and `+` would only open another empty tab. As soon as the tab shows a root, a verse or a search, the bar shows with `+`.
- **Label order:** root Arabic, then the open verse key, then the search text in quotes, then "New tab".
- **Placement:** under the search field, same width, 44px high. Phones: `top: 62px`. When the bar is shown, the maximized sheet starts at 116px and the hover hint at 120px (`.overlay:has(.tab-bar)`). The search popover (z-index 3) covers the bar while the user types.
- **Keyboard:** only the active tab is in the Tab order. Arrows move the focus; Enter or Space switches (manual activation, so arrows do not fly the camera). Ctrl/Cmd/Alt keys are left to the browser.
- **Labels use Noto Naskh Arabic:** the tall line box of Amiri Quran pushed short labels below the middle.
- **Deep links:** `useTabSync` puts the restored tab into the store first. `useHashSync` then applies a different hash to the active tab.
- No change to protected files.

## Open issues
- Desktop at 1280px: the bar (like the search field) overlaps the root panel's left edge by about 16px. It stays in the panel's padding.
- The `+` button focuses `#root-search`. If the search field's id changes, update `openEmptyTab` in `src/tabs/actions.ts`.
- Stars in the 3D scene have no new-tab gesture (scene code belongs to another goal).
- Under heavy CPU load (several Playwright workers, software WebGL) a timer can run late. The e2e long-press holds for 1.5 s for this reason.
- Each tab switch pushes a history entry (from `useHashSync`), so Back walks through switches too.
