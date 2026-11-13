# G1: data pipeline

## Done
- `pnpm data` runs `scripts/build-data.ts`. It downloads missing raw files into `data/raw/`, builds the dataset, validates it, and writes `public/data/galaxy.json`, `occurrences.json`, `verses.json` (compact JSON).
- Modules in `scripts/lib/`, each with tests (no network):
  - `raw-cache.ts`: read a cached raw file, download only if missing.
  - `tanzil.ts`: parse Tanzil `surah|ayah|text`; strip the basmala prefix from verse 1.
  - `morphology.ts`: parse corpus morphology into root segments and words per verse.
  - `transliterate.ts`: Arabic root letters to Latin, joined by hyphens.
  - `aggregate.ts`: per-root counts, lemmas, occurrences; assigns root ids.
  - `edges.ts`: co-occurrence edges, top 8 per root, union.
  - `align.ts`: Tanzil vs corpus word-count check.
  - `validate.ts`: cross-file consistency checks (run by the build; the build fails on any error).
  - `dataset.ts`: pure function that joins all steps and calls `layoutGalaxy`.

## Data stats (layout stub from G2 still in place)
| Item | Value |
|---|---|
| Verses | 6,236 |
| Roots | 1,651 |
| Words with a root | 50,268 (of 77,429) |
| Edges | 11,743 |
| Roots with no edge | 7 (نشط, دهم, سمد, سهر, طفف, فنن, هزل: their verses hold no other root) |
| Most frequent root | أله (2,851 words, 1,879 verses) |
| `galaxy.json` | 834 KB |
| `occurrences.json` | 984 KB |
| `verses.json` | 2,284 KB |

## Decisions
- **Basmala.** Tanzil puts the basmala before verse 1 of every surah except 1 and 9. The build removes it. The match uses exact code points: Tanzil writes shadda (U+0651) before the vowel mark, and surahs 95 and 97 spell the first word `بِّسْمِ`. The build fails if a verse 1 lacks the basmala.
- **Two roots in one word.** 20:94 word 2 (`يَبْنَؤُمَّ`) has two root segments (بني, أمم). The word counts once for each root.
- **Lemma** comes from the same segment as the root.
- **Sort order.** Root ids and lemma ties use code-point string order, not `localeCompare`, so output is the same on every machine.
- **Transliteration** uses ALA-LC style: digraphs `th kh dh sh gh`, dotted `ḥ ṣ ḍ ṭ ẓ`, `ʿ` for ع, `ʾ` for all hamza forms (ء أ إ ؤ ئ آ). Bare alif (in roots such as هات) is `ā`. An unknown letter stops the build.
- **Edges** are sorted by source, then target.

## Alignment mismatches (logged, build continues)
The corpus joins two Tanzil words into one in 4 verses. Tanzil text is not changed.

| Verse | Tanzil words | Corpus words | Cause |
|---|---|---|---|
| 2:181 | 14 | 13 | Corpus word 3 `بَعْدَمَا` = Tanzil words 3-4 `بَعْدَ مَا` |
| 8:6 | 12 | 11 | Same, corpus word 4 |
| 13:37 | 20 | 19 | Same, corpus word 8 |
| 37:130 | 4 | 3 | Corpus word 3 `إِلْ يَاسِينَ` = Tanzil words 3-4 |

## Open issues
- **Word highlight shift in 4 verses.** `Occurrence.w` uses corpus numbering (contract). In the 4 verses above, Tanzil word index = corpus index + 1 for every word after the joined word. A UI that highlights `ar.split(' ')[w - 1]` marks the wrong word there. Options for the main session: (a) accept; (b) map positions to Tanzil numbering in the build and change the contract comment; (c) ship a small offset table. Not changed here because it touches the contract.
- `clusterCount` is 1 until G2 replaces the layout stub. Re-run `pnpm data` after G2 merges.

## Attribution
- Morphology: Quranic Arabic Corpus v0.4 (GPL), via `github.com/mustafa0x/quran-morphology`.
- Arabic text: Tanzil Quran Text (Uthmani, Version 1.1), Copyright (C) 2007-2026 Tanzil Project, License: Creative Commons Attribution 3.0. Verbatim use only; source must be named with a link to https://tanzil.net. The Tanzil copyright notice must go with derived files.
- English: Saheeh International (`en.sahih`), from Tanzil.net.
- Note for the main session: the README needs this attribution and a link to tanzil.net (Tanzil terms).
