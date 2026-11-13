# G12: dense selection view

## Done
- **Link cap.** A focused root lights only its 20 strongest links (`TOP_LINKS` in `src/scene/neighbors.ts`).
  Their brightness follows the shared-verse weight. Its other links are faint (1.5 × the default link level).
  Hover uses the same cap with softer factors. On hover and with no focus, links that do not touch the
  focus look as before. While a root is selected they are no longer drawn (`src/scene/drawnEdges.ts`,
  an index buffer plus draw range). Before, they were drawn at 0.15 × the default level (about 0.2 %
  brightness, below one 8-bit step), so the picture does not change. With the camera now close to the
  ring, they were long on screen and doubled the frame time in software rendering (820 → 440 ms on the
  Android test device, main: 600 ms). The slow frames made Playwright taps time out.
  Neighbors past the cap dim (0.3 on selection, 0.6 on hover), so the top 20 stand out.
- **Focus ring.** On selection, the 20 strongest neighbors glide from their galaxy places into an oval spiral
  around the selected root. The ring faces the camera. Stronger links sit closer to the center.
  On close they glide home. Selecting another root re-forms the ring from where the stars are.
  "Back to …" re-forms it facing the current view.
- One source of star positions: `Glide.positions` (`src/scene/focus/glide.ts`). Star matrices, link ends,
  label anchors and tap picking all read it. The camera targets the selected root, which never moves.
- Camera frames the ring in the free area: beside the panel (desktop), above the sheet and below the
  search bar (phones). The search bar is now a `top` inset while a root is selected (`src/scene/inset.ts`).
  It is ignored when a maximized sheet would leave less than a fifth of the screen.
- While a root is selected, labels show only the selection, the hover and their strongest links.
  The frequent-root labels elsewhere crowded the gaps of the ring.
- Scene neighbor order now breaks weight ties by word count, as the panel's "Connected roots" list does,
  so the ring and the list show the same 20 roots.
- `prefers-reduced-motion`: the stars jump (glide time 0). The intro still runs first; the glide waits for it.
- `<body data-focus="moving|still">` for browser tests.
- Tests: unit tests for `focus/ring`, `focus/glide`, `focus/apply`, `focus/plan`, `focus/state`, new cases in
  `highlight`, `labels`, `neighbors`, `inset`, `camera`, `usePanelInset`. Browser tests in `e2e/focus.spec.ts`.

## Decisions
- **Ring shape.** Spiral, about 1.5 turns. Rank k (0 = strongest) sits at radius
  `0.45 + 0.55 · k / 19` (share of the ring radius). The angle starts at 110° and steps so the on-screen arc
  between neighbors is constant (0.42 ring radii). This keeps label spacing even and puts stronger links closer.
  Positions use rank, not raw weight, so equal spacing is guaranteed (raw weights bunch up).
- **Oval.** The ring is stretched sideways by the free area's width/height, clamped to 1..1.8.
  A phone's free area above the sheet is only about 412 × 260 px; a circle does not fit 20 labels there.
- **Size.** Ring radius (vertical) = 12 × the largest star radius. The camera distance fits the ring × 1.3
  (label room) into the free area with a tangent fit (`ringDistance`). So the ring always fills the free area,
  and the view scale is the same for every selection.
- **Labels.** Label line height is now 1.3 (boxes 20 px tall instead of 26). The unit test checks that
  20 labels of 30 × 20 px plus the selected label do not touch for phone and desktop frames.
- **Timing.** Glide 1.2 s, ease-in-out cubic (reused from the intro). Camera fly keeps its 0.6 s ease.
- **Link weight mapping.** Bright level = `0.3 + 0.7 · sqrt(weight / strongest weight)`.
  The old 8/sqrt(n) hub fade is gone: only 20 lines are bright now.
- **Thickness.** Not done. The links are one `LineSegments` with `LineBasicNodeMaterial`; WebGL 2 and WebGPU draw
  such lines 1 px wide whatever `linewidth` says. Thick lines need a second mesh of screen-space quads
  (`Line2`/`LineSegments2` with `Line2NodeMaterial`). Brightness plus the bloom already shows the weight well.
- **No idle auto-rotate while a root is selected.** The ring faces the camera; rotating would turn it edge-on.
- Ring targets are computed in `CameraRig`, which knows the viewing direction and the free area.
  The pure layout lives in `src/scene/focus/*`.

## Open issues
- On desktop the camera now sits inside the galaxy, so a few dimmed stars near the camera show as large soft
  discs at the screen edge. They are dim, but a near-fade in the star shader would hide them.
- When the user orbits away, the ring tilts with the scene (it is real 3D); "Back to …" re-forms it.
- Changing the sheet size or window size re-forms the ring and re-frames the camera (existing behaviour for
  the camera, now also for the ring).
- Very long roots (4 letters) are wider than the 30 px used in the layout test; the declutter step still hides
  any label that would touch another.
