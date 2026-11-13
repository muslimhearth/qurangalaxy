# G3: 3D scene — progress

## Done
- `<GalaxyScene />` (`src/scene/GalaxyScene.tsx`): full-screen canvas, `position: fixed; z-index: 0`.
- Renderer: `three/webgpu` `WebGPURenderer` through R3F's async `gl` prop (`renderer.ts`).
  It logs `[galaxy] renderer backend: WebGPU | WebGL 2` and sets `<html data-renderer="...">`.
- Stars (`Stars.tsx`): one `InstancedMesh` (icosahedron, 320 triangles), `MeshBasicNodeMaterial`
  with a TSL facing-ratio factor (bright core, darker rim). Radius on a sqrt scale of `count`.
  Color from a 12-color palette (`palette.ts`), gold first.
- Glow (`Bloom.tsx`): three/webgpu `RenderPipeline` + TSL `bloom` (strength 0.6, radius 0.4, threshold 0.3).
- Links (`Links.tsx`): all edges in one `LineSegments`, `LineBasicNodeMaterial`, additive blending.
- Highlight (`highlight.ts`): selection = strong (focus brighter, neighbors kept, others dim to 12%,
  its edges bright). Hover = the same, lighter. Colors update only when `selectedId`/`hoveredId` change.
- Picking: R3F events on the instanced mesh. Move → `hover(id)`, click → `select(id)`,
  click on empty space → `select(null)`. Pointer cursor over stars.
  `hover(null)` on star pointer-out, on empty click and on canvas `pointerleave`.
- Camera (`CameraRig.tsx`): drei `CameraControls`. Initial view and clip planes from the data's
  bounding sphere. Fly-to on selection frames the root and all its neighbors, keeping the view
  direction. Idle auto-rotate (0.03 rad/s) starts 4 s after the last interaction or selection.
- Labels (`Labels.tsx`): own DOM layer next to the canvas (`z-index: 1`, `pointer-events: none`),
  `dir="rtl"`, `lang="ar"`. Shows the selected root, the hovered root, up to 24 strongest neighbors
  of each, and the 20 most frequent roots. Positions are projected each frame in `useFrame`.
- Background (`BackgroundStars.tsx`): 4,000 seeded points in a shell at 6–9× the data radius.
- Pure, tested helpers: `palette`, `scales`, `bounds`, `neighbors`, `highlight`, `labels`,
  `camera`, `buffers`, `model`, `starfield`, `random`, `synthetic`. 53 tests.

## Decisions
- **No drei `Html`.** With React 19 each `Html` makes its own React root and logs
  "Attempted to synchronously unmount a root while React was already rendering" when labels change.
  One plain DOM layer is simpler and cheaper.
- **No R3F `ThreeElements` type augmentation** for three/webgpu: it clashes with `@types/three` 0.187.
  `extend(THREE)` is still called; JSX uses only core elements and node materials go in as props.
- **`flat` canvas** (no tone mapping) keeps palette colors true.
- **Edge brightness scales with edge count** (`edgeBaseLevel`, 1/sqrt): additive lines plus bloom
  turned the dense core white at 12k edges.
- **2× MSAA in the scene pass, no canvas MSAA.** 4× cost ~5 fps on the test iGPU.
- **`frameloop="always"`**: idle rotate and camera transitions animate continuously anyway.
- **Dev-only synthetic data**: `pnpm dev`, open `/?synthetic` → 1,700 roots, 12,000 edges, 12 clusters
  (`devSynthetic.ts`, dynamically imported only when `import.meta.env.DEV`; not in the prod bundle).
  Synthetic root text is Latin (`S12`), never Arabic.

## Performance (headless Chromium 158, AMD Renoir iGPU, 1280×800, DPR 1)
| Case | Backend | fps |
|---|---|---|
| Fixture | WebGPU (Vulkan) | 60 (vsync cap) |
| Synthetic 1,700 / 12,000, MSAA 4× | WebGPU | ~55 |
| Synthetic 1,700 / 12,000, MSAA 2× (shipped) | WebGPU | 60 |
| Synthetic 1,700 / 12,000, MSAA 2× | WebGL 2 fallback (ANGLE Vulkan) | 60 |
| Fixture | WebGL 2, software (headless shell, no GPU) | 4 |

Without bloom or without links, 4× MSAA also held 60 fps; the combination was the limit.

## Open issues
- Bundle is ~530 kB gzip. R3F's core imports `three`'s `WebGLRenderer`, so it ships unused.
- Console warnings from libraries, not our code: `THREE.Clock` deprecated (R3F),
  `PCFSoftShadowMap has been removed` (R3F's default shadow type).
- Headless *shell* Chromium with `--enable-unsafe-webgpu` lost the WebGPU device at startup
  ("A valid external Instance reference no longer exists"). Full Chromium with Vulkan works.
  Watch for this in e2e tests; use the full `chromium` channel or the WebGL 2 fallback there.
- Labels of the 20 top roots can overlap in the dense core. A screen-space declutter could follow.
