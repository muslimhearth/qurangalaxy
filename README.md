# Quran Root Galaxy

Explore the Arabic roots of the Quran as a 3D galaxy.
Each star is a root. Its size shows how often the root occurs. Lines join roots that share verses.
Click a star to see its word forms and every verse that uses it.

Live: https://quranic.space

## Quick start
```sh
pnpm install
pnpm data      # build public/data from the sources (needs internet once)
pnpm models    # download the meaning-search model into public/models (23 MB, not in git)
pnpm dev       # open http://localhost:5173
```

## Scripts
| Command | Job |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm test` | Unit tests (406) |
| `pnpm test:e2e` | Browser tests: desktop Chromium and Android (Pixel 7) |
| `pnpm test:e2e:iphone` | Browser tests on iPhone 15 (WebKit), in the official Playwright container (needs podman) |
| `pnpm data` | Rebuild `public/data/` from the sources (Wiktionary responses are cached in `data/raw/`) |
| `pnpm data:glosses` | Fetch only the Wiktionary meanings (about 15 minutes from an empty cache) |
| `pnpm models` | Download the meaning-search model into `public/models/` |
| `pnpm embeddings` | Rebuild the verse vectors for meaning search |
| `pnpm eval:semantic` | Check meaning-search quality on a set of test phrases |
| `pnpm ship` | Build and upload to the server (`DEPLOY_TARGET=user@host:dir`) |
| `pnpm build` | Typecheck and production build |

## Features
- 1,651 roots as stars in 10 theme clusters; star size = word count; links = shared verses.
- Search in Arabic (diacritics ignored), root letters (`rhm`), Latin spelling (`noor`, `rahmaan`, `salah`, chat digits `3ilm`) or English (`light`, `sea`, `mother`).
- Search by meaning: move the *Exact ↔ Meaning* slider and type a phrase ("patience in hardship"). The first use downloads a small English model (23 MB) from this site; it runs in your browser.
- English meanings for roots and word forms in the root panel.
- Root panel: lemmas, the strongest connected roots, every verse with the root's words highlighted.
- Labels never overlap; the camera frames the selection beside the panel (desktop) or above the sheet (phones).
- Deep links: `#/root/رحم`. Works on desktop and phones (bottom sheet that minimizes to its header).
- Touchpad: pinch zooms toward the pointer, two-finger swipe orbits. The galaxy turns slowly when idle.
- WebGPU rendering with automatic WebGL 2 fallback.

## Stack
Vite, React 19, TypeScript, react-three-fiber, three.js (WebGPU with WebGL fallback), Zustand, Vitest, Playwright.

## Data and license
- Morphology: [Quranic Arabic Corpus](https://corpus.quran.com) v0.4 (GPL).
- Arabic text: Tanzil Quran Text (Uthmani, Version 1.1), Copyright (C) 2007-2026 [Tanzil Project](https://tanzil.net), Creative Commons Attribution 3.0. Used verbatim.
- English translation: Saheeh International, from [Tanzil.net](https://tanzil.net/trans/).
- English meanings of roots and words: [English Wiktionary](https://en.wiktionary.org) (root appendix pages and Arabic entries), by Wiktionary contributors, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The glosses were shortened automatically. Where Wiktionary has no entry, meanings are the most distinctive words of the Saheeh International translation in the root's verses.
- Meaning search: [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (Apache-2.0) through transformers.js, self-hosted.
- Fonts: Amiri Quran and Noto Naskh Arabic (SIL Open Font License), self-hosted through Fontsource.
- Full notice for the generated data: `public/data/NOTICE.txt`.

Code is licensed GPL-3.0-or-later. See `LICENSE` and `docs/ARCHITECTURE.md`.
