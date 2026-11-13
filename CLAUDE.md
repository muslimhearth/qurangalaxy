# Quran Root Galaxy: rules for every session

## What this is
A 3D web app. Each of the Quran's ~1,700 Arabic roots is a star. Star size = word count.
Lines join roots that share verses. Click a star to see its lemmas and every verse that uses it.

Read `docs/ARCHITECTURE.md` before you change code. The data contract is `src/data/types.ts`.
Do not change `src/data/types.ts`, `src/state/store.ts` or `src/App.tsx` in a goal branch.
If you need a change there, stop and report it to the main session.

## Commands
- `pnpm test`: unit tests (Vitest). `pnpm typecheck`: TypeScript. `pnpm build`: production build.
- `pnpm data`: build `public/data/*.json` from raw sources. `pnpm test:e2e`: Playwright.

## Working rules
- Test-driven: write a failing test first, then the code, then refactor. Every module has tests.
- Code is simple and readable. Every exported function and type has a short doc comment.
  Add inline comments where the reason is not obvious.
- Keep files small and single-purpose.
- Quran text comes only from verified sources (Tanzil, Quranic Arabic Corpus). Never generate or edit it.

## Git rules
- Commits are the user's own. Author is the user. No `Co-Authored-By` or other trailers.
- One-line commit message, imperative mood (e.g. "Add morphology parser"). No body unless really needed.
- Commit small, working steps. Never push. Never rewrite main.
- Before you finish, check `git log --format='%h %s%n%(trailers)'` and remove any trailers.

## Progress
- Each goal keeps its own file `docs/progress/<goal>.md`: done, decisions, open issues.
- Only the main session edits `docs/PROGRESS.md`, `README.md` and `docs/ARCHITECTURE.md`.
