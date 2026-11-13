# Quran Root Galaxy

Explore the Arabic roots of the Quran as a 3D galaxy.
Each star is a root. Its size shows how often the root occurs. Lines join roots that share verses.
Click a star to see its word forms and every verse that uses it.

## Quick start
```sh
pnpm install
pnpm data      # build public/data from the sources (needs internet once)
pnpm dev       # open http://localhost:5173
```

## Scripts
| Command | Job |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Browser tests |
| `pnpm build` | Typecheck and production build |

## Stack
Vite, React 19, TypeScript, react-three-fiber, three.js (WebGPU with WebGL fallback), Zustand, Vitest, Playwright.

## Data and license
- Morphology: [Quranic Arabic Corpus](https://corpus.quran.com) v0.4 (GPL).
- Arabic text: Tanzil Quran Text (Uthmani, Version 1.1), Copyright (C) 2007-2026 [Tanzil Project](https://tanzil.net), Creative Commons Attribution 3.0. Used verbatim.
- English translation: Saheeh International, from [Tanzil.net](https://tanzil.net/trans/).
- Full notice for the generated data: `public/data/NOTICE.txt`.

Code is licensed GPL-3.0-or-later. See `LICENSE` and `docs/ARCHITECTURE.md`.
