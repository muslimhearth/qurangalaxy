# G18: Arabic word search

## Done
- **Search key** (`src/search/arabicKey.ts`). One key for a Tanzil Uthmani word and for plain keyboard text.
  Rules: drop marks and tatweel; drop the small waw/yaa after a final haa (بِهِۦ); small yaa → ي (إِبْرَٰهِـۧمَ);
  waw + dagger alef and inner alef maqsura + dagger alef → alef (صلوٰة, أدرىٰك); drop yaa + "silent" sign;
  ى → ي, ة → ه; drop every alef and hamza form. So يسألونك, يسالونك and يَسْـَٔلُونَكَ have one key.
- **Word-form index** (`src/search/wordForms.ts`, `public/data/wordforms.json`). Key → `[root id, count, most frequent
  Uthmani spelling]`, from `verses.json` + `occurrences.json` (Tanzil text, corpus roots). Only words with a root.
  12,027 keys (306 with more than one root). 553 KB, 133 KB gzip. Loads only on the first Arabic query
  (`wordFormsLoad.ts`, `useWordForms`). `pnpm data` writes it; `pnpm data:wordforms` rebuilds it from `public/data`.
- **Matcher** (`src/search/wordFormMatcher.ts`, added to `MATCHERS`). Whole Quran word: exact tier (1.0) for the main
  root, up to 0.1 less for a rare root of the same form. Word start (3+ key letters, while typing): prefix tier,
  top 10 roots. The reason is the matched Quran word (shown in the result note).
- **No meaning search for Arabic** (`useSemanticSearch`, `meaningWeight` in `src/search/blend.ts`). Arabic queries do
  not load the model or run a search; they get `[]` at once (nothing "pending"), and the blend uses weight 0.
  The slider keeps its value. Roots and verses mode.
- **Verse search in Arabic** (`src/verses/arabic.ts`, `useVerseResults`). Typed words against the keys of the
  Uthmani words: whole word 1, word start 0.8 (3+ key letters), another form of the typed word's root 0.6
  (root forms come from the word-form index; a root must have ≥ 25 % of a form's uses). Phrase in order: +0.15.
  Arabic search does not wait for the transliteration. The Arabic line marks the matched words and starts two words
  before the first hit when it is past word 4 (`markedArabic`, `VerseOption`).
- **Coverage** (`pnpm eval:wordforms`, `scripts/lib/wordform-coverage.ts`). Typed form = Tanzil Simple Clean (plain
  text, cached in `data/raw/`, not shipped), word-aligned to the Uthmani text (basmala removed, "يا X" joined).
- **Tests.** Unit tests for every new module; `SearchBox.arabic.test.tsx`; e2e `e2e/arabic-search.spec.ts`.

## Coverage
- Root words checked: 49,942 (327 skipped: verses whose word counts still differ).
- Typed word finds its root: 49,935 = **99.99 %**. Its most frequent root is the right one: 49,204 = **98.52 %**.
- The 1.5 % gap: one key with several roots (mostly because alef and hamza are dropped).
- Misses left: سأريكم (سَأُو۟رِيكُمْ), ونأى (وَنَـَٔا), ويبسط (وَيَبْصُۜطُ), الأقصى (ٱلْأَقْصَا), تترى (تَتْرَا).
- Before G18 the typed word found its root only when it was the root letters or a lemma.

## Examples (real data)
| Query | Roots mode | Verses mode |
|---|---|---|
| ظهورها | ظهر (exact), note ظُهُورِهَا | 57 verses: 2:189, 6:138, 43:13 (whole word), then ظهورهم (word start), then other forms |
| يسألونك / يسالونك | سأل, note يَسْـَٔلُونَكَ | 8 whole-word verses first (2:189, 2:215, 2:217, 2:219, 5:4, 7:187, 8:1, 79:42), 120 in all |
| رحمة | رحم (lemma رَحْمَة) | 35 whole-word verses (3:8 …), word starts (2:228, 17:24), then 313 with the root |
| الرحمن | رحم, note ٱلرَّحْمَٰنِ | 45 whole-word verses (1:1, 1:3, 2:163 …), then other forms of رحم |
| قل | قول first (count breaks the tie with lemma قَلَّ of قلل) | 642 whole-word verses: قُلْ and قَالَ share a key |

Timing (Node, all verses): Arabic index build ~130-270 ms once; a query 5-60 ms.

## Decisions
- Drop all alef and hamza forms in the key. Uthmani and plain text place them differently (dagger alef,
  hamza on tatweel). Cost: some forms collide (قل = قال, ظهورها starts ظهورهم). The counts rank them.
- If a key has no hit, try one "لل" or "يي" as a single letter (Uthmani ٱلَّيْل, يُحْىِ).
- Simple Clean is used only to measure coverage. The index uses only the shipped data.
- `VerseMatch.source` has a new value `'ar'`. `SearchBox` changes: 2 hooks lines (`useWordForms`, `meaningWeight`).

## Open issues
- `public/data/NOTICE.txt` and `docs/ARCHITECTURE.md` should list `wordforms.json` (derived from Tanzil + corpus).
  Only the main session edits ARCHITECTURE.
- Typed spellings that keep a hamza seat as a plain letter (مومن for مؤمن) do not match: ؤ and ئ are dropped.
- A typed word that is not itself in the Quran gets no root forms in verse search (only whole word / word start).
- e2e: under high machine load, `verse-search.spec.ts` "English phrase" times out when run in parallel; it passes
  with `--workers=1`. Not caused by G18.
