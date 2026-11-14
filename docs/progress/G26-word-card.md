# G26: Word card

## Done
- **Card.** Tap, click, Enter or Space on any Quran word in the root panel verses, the verse panel and the surah reader opens the card (`src/morph/WordCard.tsx`). It shows:
  - header: verse:word, the word, close button;
  - parts as boxes right to left, stem in gold, short labels ("the", "and", "they"); the grammar name is the hover title (`grammar.ts`);
  - grammar in plain English on two lines (e.g. "Verb · Form I · perfect (past) · active" / "3rd person · masculine · plural");
  - lemma box (with `Lemma.en`, no Corpus glosses) and root box;
  - "In the Quran": Same form / Same lemma / Same root with word and verse counts. Each row expands to a verse list (word marked, "here" on the current verse, 20 per page, "Show more"). A verse row opens the verse in the reader;
  - footer credit to the Quranic Arabic Corpus.
- **Root link.** Plain tap: desktop selects the root in the current tab (reader and verse panel close); phone opens it in a new, active tab, so the reader stays. Ctrl/Cmd/middle-click and long-press: new tab (`useNewTabGesture`). Verse rows have the same gestures.
- **Layout.** Phone (≤ 720 px): bottom sheet without scrim, 60vh (74vh with a list open). Another word tap switches the card. The panel scrolls so the tapped line shows just above the sheet. A root panel under the sheet grows to just below the search field. Desktop: 360 px popover left of the panel, arrow at the tapped word's line; it follows panel scroll and window resize (`placement.ts`). Tapped word: gold background and outline; desktop hover: dotted underline.
- **Accessibility.** Words are `role="button"` with a roving tabindex: one Tab stop per verse. Arrow keys move (ArrowLeft = next word, RTL), Home/End jump to the ends, Enter/Space open the card. The card is `role="dialog"`. Focus goes to the close button. Escape closes only the card (capture listener) and returns focus to the word. Rows use `aria-expanded`/`aria-controls`. A click outside closes the card. A change of reader place, verse, root or tab also closes it.
- **Data** (`pnpm data` runs `scripts/build-morph.ts`; it also runs alone as `pnpm data:morph`, which needs no Wiktionary cache):
  - `public/data/morph/{1..114}.json`: per verse, per Tanzil word `[root, lemma, text, tag, …]`. `public/data/morph/tags.json`: 1,004 shared tag strings. Types: `src/morph/types.ts`.
  - `public/data/particles.json`: 135 root-less lemmas with delta-coded global Tanzil word indices.
  - Sizes: morph/ 115 files, 2,573 KB (561 KB gzip, largest surah 2 = 37 KB gzip); particles.json 75 KB (30 KB gzip).
  - Lazy: the surah file loads on the first tap. The reader prefetches it 0.5 s after its verses load.
- **Build check.** The joined Corpus segments must spell the Tanzil word (`scripts/lib/morph/check.ts`). Known spelling conventions are ignored: hamza (ءَا vs ـَٔا), small yeh (ۦ vs ـۧ) and the space in the joined words. The 4 joined-word verses use `JOINED_WORDS` (wordmap.ts). There are 2 listed exceptions (12:39:1, 12:41:1: Corpus يَٰصَىٰحِبَىِ). Every Tanzil word must get a row. The build stops on any error.
- **Counts.** Same root = `occurrences.json`; same lemma = `lemmas.json` + `lemmaOccurrences`; same form = root (or particle lemma) occurrences filtered by the exact Tanzil spelling. Homographs from other roots are not counted. `src/data/load.ts` gets a fixture-free `loadJson`.

## Decisions
- "Same form" = exact Tanzil spelling with diacritics, within the word's own root or particle lemma.
- A word's root and lemma come from its first root segment (as in `lemmas.json`). A root-less word's lemma comes from its stem (the first segment that is not a prefix).
- The second Tanzil word of a joined pair (e.g. مَا in بَعْدَ مَا) opens the card of the joined Corpus word.
- Pronoun suffix roles: on a verb, the first suffix is the subject when the verb form needs a subject suffix; other suffixes on verbs and particles are objects; suffixes on nouns are possessive.
- Particles have no English meaning in the data: the lemma box shows the grammar name. Their root box says "No root". Words without a lemma (Quranic initials) have no "In the Quran" rows.
- Card styles live in `src/morph/wordCard.css` (imported by the card), not in `styles.css`.

## Tests
- Unit: parse, spelling check, build (fixture), whole-Quran output check (77,433 Tanzil words, all joined segments spell their word, 4 joined verses, valid ids), tag → plain English, counts (قَالُوٓا۟ 2:30: form 77/74, lemma 1,618/1,321, root 1,722/1,383; ٱلرَّحْمَٰنِ 1:3: 21/21, 57/56, 339/313; particle فِي), placement, VerseWords keyboard, WordCard (open, focus, Escape, switch word, expand, verse open, root desktop/phone, close on place change).
- e2e `e2e/word-card.spec.ts` (desktop + android): reader 2:30 قَالُوٓا۟ → card, grammar, counts, expand Same lemma, open 2:14; keyboard (desktop); root link (desktop: same tab; phone: new tab).

## Open issues
- Prefix and suffix labels are short heuristics (e.g. ل = "for", 3FS object = "her" also where English says "it").
- The word card code is in the main chunk (now 107 kB gzip). It could move into a lazy chunk.
- iPhone (WebKit) e2e not run.
