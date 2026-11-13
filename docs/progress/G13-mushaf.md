# G13: Mushaf of Light

A second, 2D layout: the whole Quran as a mosaic of 6,236 verse dots in Mushaf order. No pinch zoom needed.

## Done
- **Mosaic** (`src/mushaf/MushafView.tsx`): one `<canvas>` 2D, sized for `devicePixelRatio`. It redraws only when the layout, lit states, hover or fade change.
  - Dots are rounded squares, left to right in rows. Each surah that starts mid-row gets a small extra gap.
  - Dim dots `#1a1e31`. Selected root: amber `#ffc35a` with a soft glow. Compare root (`compareRootId` prop): blue `#6fd0ff`. Both: white.
  - Lit dots fade in over 450 ms when the roots change (`useFade`). No fade with `prefers-reduced-motion`.
  - Background: the radial gradient of the approved design, ending in `--bg`.
- **Sizing** (`layout.ts`, pure): tries dot sizes from 12 px down to 2 px in 0.25 px steps. Gap = dot / 4 (min 1 px), surah gap = dot × 0.75. Picks the largest size where the whole Quran fits, then centers it. Results: about 6.75 px dots on desktop with the panel open, about 8 px without it; about 4 px on a phone without the sheet, about 2.5 px with the sheet at normal size.
- **Free area** (`freeArea.ts` pure + `useFreeArea.ts`): below the search field (and toggle), above the phone title bar, left of the side panel, above the bottom sheet (any size). It measures the DOM itself (`.search`, `.mushaf-toggle`, `.about`, `.root-panel`) with a `ResizeObserver` and a `MutationObserver`, one measure per frame at most. It does not use `src/scene/*`.
- **Surah numbers** at the left edge: each row shows the first surah that starts in it. Labels closer than 11 px to the previous one are skipped, so they never crowd.
- **Hover / press**: a tooltip shows the surah name (`surahs.ts`, 114 transliterated names and verse counts) and the verse key, plus "uses <root>" for lit dots. The whole surah gets an outline (union of row bands: stroke, then erase the inside) and brighter dim dots.
  - Mouse: the dot under the pointer. Touch: the nearest dot within 12 px (`hitTest`, row-limited math, no DOM).
  - Keyboard: the canvas is focusable. Arrow keys move between verses. Enter opens the verse.
- **Tap / click**: when a root is selected and the verse uses it, the root panel scrolls to that verse and flashes it. Otherwise only the tooltip shows.
  - `src/ui/verseFocus.ts`: a small Zustand store with `focusVerse(key)`.
  - `VerseList` grows "show more" pages until the verse is shown, scrolls it to the center and adds `.flash` for 1.8 s.
  - `RootPanel` opens a minimized phone sheet on a new request.
- **Legend** under the mosaic on wide screens: the root swatches with verse counts and "N use both", or a one-line explanation when no root is selected.
- **`LayoutToggle.tsx`**: segmented "Galaxy | Mushaf" control. It uses buttons with `aria-pressed` inside `role="group"`, with 44 px tall targets. Bottom left on desktop, under the search field on phones.
- **`hash.ts`**: `splitLayoutHash` / `joinLayoutHash` for `#/mushaf/root/<arabic>`. Old `#/root/…` links stay the galaxy.
- **Dev harness**: `/src/mushaf/dev/index.html#/root/رحم` (optional `?compare=ظلم`). It renders the mosaic with the real `Overlay`. Vite serves it in dev only, so it is not in the production build. `App.tsx` is unchanged.
- **Tests**: unit tests for surahs, layout, lit, draw (fake context), freeArea, hash, LayoutToggle, MushafView, verseFocus, VerseList and RootPanel focus. `e2e/mushaf.spec.ts` (desktop + android) checks the lit pixels, the tooltip and that a tap scrolls the panel to the verse.

## Decisions
- Verse counts per surah live in `surahs.ts` (standard metadata, checked against `verses.json`: 6,236). So the mosaic draws before any data loads. Only `occurrences.json` loads, and only when a root is selected.
- Canvas data attributes (`data-left`, `data-top`, `data-pitch`, `data-dot`) give the mosaic geometry to browser tests.
- The compare root is a prop for now. No UI sets it yet (the harness uses `?compare=`).

## Patch for the main session (store, App, URL hash)
Tested in this worktree, then reverted: typecheck passes, unit tests pass, and in a real browser `#/mushaf/root/رحم` → toggle Galaxy → `#/root/رحم` → Back → Mushaf. Apply with `git apply` from the repo root.
It adds `layout` + `setLayout` to the store. `App` renders `MushafView` instead of the lazy `GalaxyScene` when the layout is `mushaf`, and adds the toggle in its own click-through `.overlay` layer. `useHashSync` reads and writes the layout prefix. The hash test gets `afterEach(cleanup)`, because still-mounted hooks from earlier tests rewrote the hash.

```diff
diff --git a/src/App.tsx b/src/App.tsx
index c44a94a..d245520 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,19 +1,35 @@
 import { lazy, Suspense } from 'react';
 import { Overlay } from './ui/Overlay';
 import { useLoadGalaxy } from './data/useLoadGalaxy';
+import { useGalaxyStore } from './state/store';
+import { LayoutToggle } from './mushaf/LayoutToggle';
+import { MushafView } from './mushaf/MushafView';
 
 // three.js is most of the bundle; load the scene in its own chunk so the UI paints first.
 const GalaxyScene = lazy(() => import('./scene/GalaxyScene').then((m) => ({ default: m.GalaxyScene })));
 
-/** Root component: loads the data, then layers the 2D UI over the 3D scene. */
+/** Root component: loads the data, then layers the 2D UI over the 3D scene or the Mushaf mosaic. */
 export function App() {
   useLoadGalaxy();
+  const galaxy = useGalaxyStore((s) => s.galaxy);
+  const layout = useGalaxyStore((s) => s.layout);
+  const setLayout = useGalaxyStore((s) => s.setLayout);
   return (
     <>
-      <Suspense fallback={null}>
-        <GalaxyScene />
-      </Suspense>
+      {layout === 'mushaf' ? (
+        <MushafView />
+      ) : (
+        <Suspense fallback={null}>
+          <GalaxyScene />
+        </Suspense>
+      )}
       <Overlay />
+      {galaxy && (
+        // Own click-through layer, so Overlay stays unchanged; the toggle is a .panel and catches clicks.
+        <div className="overlay">
+          <LayoutToggle value={layout} onChange={setLayout} />
+        </div>
+      )}
     </>
   );
 }
diff --git a/src/state/store.ts b/src/state/store.ts
index ce8b38d..66aca0d 100644
--- a/src/state/store.ts
+++ b/src/state/store.ts
@@ -1,5 +1,6 @@
 import { create } from 'zustand';
 import type { Galaxy } from '../data/types';
+import type { Layout } from '../mushaf/LayoutToggle';
 
 /** App-wide state shared by the 3D scene and the 2D UI. */
 export interface GalaxyState {
@@ -17,6 +18,8 @@ export interface GalaxyState {
   awayFromSelection: boolean;
   /** Bumped to ask the camera to fly back to the selected root. */
   recenterTick: number;
+  /** Main view: the 3D galaxy or the 2D Mushaf mosaic. */
+  layout: Layout;
   setGalaxy: (galaxy: Galaxy) => void;
   select: (id: number | null) => void;
   hover: (id: number | null) => void;
@@ -24,6 +27,7 @@ export interface GalaxyState {
   setSemanticWeight: (weight: number) => void;
   setAwayFromSelection: (away: boolean) => void;
   recenter: () => void;
+  setLayout: (layout: Layout) => void;
 }
 
 export const useGalaxyStore = create<GalaxyState>()((set) => ({
@@ -34,6 +38,7 @@ export const useGalaxyStore = create<GalaxyState>()((set) => ({
   semanticWeight: 0,
   awayFromSelection: false,
   recenterTick: 0,
+  layout: 'galaxy',
   setGalaxy: (galaxy) => set({ galaxy }),
   // A new selection is framed by the camera, so it is not "away".
   select: (selectedId) => set({ selectedId, awayFromSelection: false }),
@@ -42,4 +47,5 @@ export const useGalaxyStore = create<GalaxyState>()((set) => ({
   setSemanticWeight: (w) => set({ semanticWeight: Math.min(1, Math.max(0, w)) }),
   setAwayFromSelection: (awayFromSelection) => set({ awayFromSelection }),
   recenter: () => set((s) => ({ recenterTick: s.recenterTick + 1, awayFromSelection: false })),
+  setLayout: (layout) => set({ layout }),
 }));
diff --git a/src/ui/useHashSync.test.tsx b/src/ui/useHashSync.test.tsx
index 9714d37..b425767 100644
--- a/src/ui/useHashSync.test.tsx
+++ b/src/ui/useHashSync.test.tsx
@@ -1,5 +1,5 @@
-import { beforeEach, describe, expect, it } from 'vitest';
-import { act, renderHook } from '@testing-library/react';
+import { afterEach, beforeEach, describe, expect, it } from 'vitest';
+import { act, cleanup, renderHook } from '@testing-library/react';
 import { useHashSync } from './useHashSync';
 import { useGalaxyStore } from '../state/store';
 import { fixtureGalaxy } from '../data/fixture';
@@ -11,6 +11,8 @@ describe('useHashSync', () => {
     useGalaxyStore.setState(useGalaxyStore.getInitialState());
     window.history.replaceState(null, '', '/');
   });
+  // Unmount earlier hooks: still mounted, they would rewrite the hash on the next store change.
+  afterEach(cleanup);
 
   it('selects the deep-linked root once the galaxy is ready', () => {
     window.history.replaceState(null, '', '/' + rhm);
@@ -30,6 +32,18 @@ describe('useHashSync', () => {
     expect(window.location.hash).toBe('');
   });
 
+  it('reads and writes the Mushaf layout in the hash', () => {
+    window.history.replaceState(null, '', '/#/mushaf' + rhm.slice(1));
+    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
+    renderHook(() => useHashSync());
+    expect(useGalaxyStore.getState().layout).toBe('mushaf');
+    expect(useGalaxyStore.getState().selectedId).toBe(2);
+    act(() => useGalaxyStore.getState().setLayout('galaxy'));
+    expect(window.location.hash).toBe(rhm);
+    act(() => useGalaxyStore.getState().setLayout('mushaf'));
+    expect(window.location.hash).toBe('#/mushaf' + rhm.slice(1));
+  });
+
   it('follows back/forward navigation', () => {
     useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
     renderHook(() => useHashSync());
diff --git a/src/ui/useHashSync.ts b/src/ui/useHashSync.ts
index 15e6b9a..91fceb0 100644
--- a/src/ui/useHashSync.ts
+++ b/src/ui/useHashSync.ts
@@ -1,9 +1,10 @@
 import { useEffect, useRef } from 'react';
 import { useGalaxyStore } from '../state/store';
+import { joinLayoutHash, splitLayoutHash } from '../mushaf/hash';
 import { hashForRoot, parseRootHash } from './helpers';
 
 /**
- * Keeps the selection and the URL hash (`#/root/<arabic>`) in sync both ways:
+ * Keeps the selection, the layout and the URL hash (`#/root/<arabic>`, `#/mushaf/root/<arabic>`) in sync both ways:
  * applies a deep link once the galaxy loads, pushes a history entry per selection,
  * and follows back/forward navigation.
  */
@@ -11,6 +12,8 @@ export function useHashSync() {
   const galaxy = useGalaxyStore((s) => s.galaxy);
   const selectedId = useGalaxyStore((s) => s.selectedId);
   const select = useGalaxyStore((s) => s.select);
+  const layout = useGalaxyStore((s) => s.layout);
+  const setLayout = useGalaxyStore((s) => s.setLayout);
   const deepLinkDone = useRef(false);
 
   // Store -> URL. The first run after load applies the deep link instead.
@@ -18,26 +21,31 @@ export function useHashSync() {
     if (!galaxy) return;
     if (!deepLinkDone.current) {
       deepLinkDone.current = true;
-      const linked = parseRootHash(window.location.hash, galaxy.roots);
-      if (linked !== null && linked !== selectedId) {
-        select(linked);
+      const linked = splitLayoutHash(window.location.hash);
+      const linkedId = parseRootHash(linked.rootHash, galaxy.roots);
+      if (linked.layout !== layout || (linkedId !== null && linkedId !== selectedId)) {
+        setLayout(linked.layout);
+        if (linkedId !== null) select(linkedId);
         return;
       }
     }
     const root = selectedId === null ? undefined : galaxy.roots[selectedId];
-    const wanted = root ? hashForRoot(root) : '';
+    const wanted = joinLayoutHash(layout, root ? hashForRoot(root) : '');
     if (window.location.hash === wanted) return;
     // pushState (unlike setting location.hash) fires no hashchange, so no feedback loop.
     const { pathname, search } = window.location;
     window.history.pushState(null, '', pathname + search + wanted);
-  }, [galaxy, selectedId, select]);
+  }, [galaxy, selectedId, select, layout, setLayout]);
 
   // URL -> store, for back/forward and hand-edited hashes.
   useEffect(() => {
     if (!galaxy) return;
     const onNavigate = () => {
-      const id = parseRootHash(window.location.hash, galaxy.roots);
-      if (id !== useGalaxyStore.getState().selectedId) select(id);
+      const linked = splitLayoutHash(window.location.hash);
+      const id = parseRootHash(linked.rootHash, galaxy.roots);
+      const state = useGalaxyStore.getState();
+      if (linked.layout !== state.layout) setLayout(linked.layout);
+      if (id !== state.selectedId) select(id);
     };
     window.addEventListener('popstate', onNavigate);
     window.addEventListener('hashchange', onNavigate);
@@ -45,5 +53,5 @@ export function useHashSync() {
       window.removeEventListener('popstate', onNavigate);
       window.removeEventListener('hashchange', onNavigate);
     };
-  }, [galaxy, select]);
+  }, [galaxy, select, setLayout]);
 }
```

Optional later: `compareId: number | null` + `setCompare` in the store, then `<MushafView compareRootId={compareId ?? undefined} />` and a UI to pick it (for example "compare" on a connected-root chip).

## Open issues
- With the bottom sheet at normal size (62vh), phones have only about 260 px of height for the mosaic, so dots are about 2.5 px. Minimizing the sheet gives about 4 px. A smaller "normal" sheet in Mushaf mode would help (RootPanel change, main session).
- On phones the toggle sits under the search field and costs about 56 px of mosaic height. The design reference puts it in the sheet. That needs a RootPanel change.
- In the galaxy layout on phones, the toggle (top right, under the search) can overlap the hover hint (`.hover-hint`, top 76 px). The hint shows only on hover, which is rare on phones.
- "Back to …" (RecenterButton) is a galaxy camera control. It is hidden in Mushaf mode only because `awayFromSelection` stays false. Consider hiding it explicitly once the store has `layout`.
