# G25: Better meaning search for verses, measured

## Done
- **Verse eval set**: `scripts/semantic/verse-eval.json`. 38 everyday queries (grief, patience, parents, orphans, forgiveness, hope, gratitude, fair trade, anger, fear, provision, prayer, charity, justice, trials, mercy, repentance, family, wealth, arrogance, backbiting, truth, trust, illness, greed, promises, alcohol, life, knowledge, moderation, usury, envy, purpose). Each has 2–6 expected verse keys. Every key was checked by reading its Saheeh International text in `public/data/verses.json`.
- **`pnpm eval:semantic`**:
  - No flags: evaluates the shipped `public/data/embeddings.*` and prints per-query hits (rank of first hit, top 5, rank of each expected verse).
  - `--files <base>`: evaluates any other embedding set.
  - `--sweep [--model id] [--window] [--verbose]`: every downloaded model × every recipe.
  - Verse metrics: recall@10 (share of expected verses in the top 10, averaged), hit@10 (any expected verse in the top 10), MRR over the top 40.
  - Root metrics (G9 set, 35 queries): hit@1, hit@5, MRR. This checks that root mode does not get worse.
  - Raw float vectors per model are cached in `data/raw/embeddings/` (gitignored).
- **Recipe** (`scripts/semantic/recipe.ts`, `context.ts`): build-time steps from raw vectors to the int8 matrix.
  - Neighbour context: `normalize(self × verse + (1 − self) × mean(prev, next))`, same surah only.
  - Short-verse factor: rows of verses with fewer than 12 words are stored shorter than unit length, `(words / 12) ^ power`. Every cosine for that verse shrinks by that factor. `encodeEmbeddings` takes the optional per-row factors.
  - Text window (eval only): embed "prev + verse + next" as one text and mix it with the verse vector.
- **Shipped**: `Snowflake/snowflake-arctic-embed-s` (Apache-2.0, q8 34 MB), self weight 0.7, short-verse power 0.1. Query prefix "Represent this sentence for searching relevant passages: ", CLS pooling (in `src/semantic/models.ts`). `pnpm models` fetches it; `pnpm embeddings` rebuilds the files with `SHIPPED`.
- **No runtime change**: context and the short-verse factor are baked into `embeddings.bin`. The worker, the lazy load and the self-hosted model path are unchanged.

## Results (38 verse queries, 35 root queries)

| Model + recipe | Verse R@10 | hit@10 | MRR | Root hit@1 | hit@5 | MRR |
|---|---|---|---|---|---|---|
| all-MiniLM-L6-v2, plain (baseline) | 19% | 50% | 0.29 | 71% | 94% | 0.81 |
| MiniLM, self 0.7 | 16% | 39% | 0.31 | 74% | 94% | 0.83 |
| MiniLM, pow 0.1 | 20% | 53% | 0.29 | 69% | 91% | 0.79 |
| bge-small-en-v1.5, plain | 19% | 53% | 0.32 | 74% | 91% | 0.83 |
| bge-small, self 0.8 | 22% | 55% | 0.34 | 69% | 86% | 0.77 |
| gte-small, plain | 20% | 47% | 0.33 | 77% | 86% | 0.82 |
| e5-small-v2, plain | 21% | 53% | 0.39 | 66% | 89% | 0.77 |
| e5-small-v2, pow 0.1 | 24% | 53% | 0.40 | 69% | 89% | 0.77 |
| e5-small-v2, window 0.3 | 22% | 55% | 0.35 | 57% | 89% | 0.71 |
| arctic-embed-xs, plain | 19% | 53% | 0.34 | 69% | 89% | 0.77 |
| arctic-embed-s, plain | 22% | 55% | 0.36 | 74% | 97% | 0.85 |
| arctic-embed-s, self 0.7 | 25% | 55% | 0.38 | 77% | 94% | 0.85 |
| arctic-embed-s, window 0.5 | 21% | 53% | 0.34 | 80% | 91% | 0.86 |
| **arctic-embed-s, self 0.7, pow 0.1 (shipped)** | **26%** | **55%** | **0.41** | 74% | 94% | 0.84 |

Findings:
- The model matters most. arctic-embed-s is best on both verse and root search.
- Neighbour context helps arctic-embed-s and bge, but hurts MiniLM, gte and e5. Strong context (self ≤ 0.5) hurts every model.
- A small short-verse factor (power 0.1–0.2) helps a little. Larger powers hurt MRR.
- The text window (prev + verse + next as one text) does not help and costs 1.5× build time.
- One query is about 2.6% of hit@10. Most differences in the table are within 1–2 queries. The shipped choice is better than the baseline on every verse metric and on root MRR.

"death of a loved one", semantic only, top 5:
- Before: 75:28, 10:56, 80:21, 69:27, 19:23. No expected verse in the top 10 (3:185 at 29).
- After: 10:56, 26:81, 15:23, **2:155**, 2:258. 2:155 at 4; 2:156 and 2:157 are still outside the top 40.

## Sizes
- `embeddings.bin`: 2.39 MB (unchanged, 6,236 × 384 int8); gzip 1.98 → 1.74 MB. `embeddings.json`: 49 kB.
- Model download: 23 MB (MiniLM) → 34 MB (arctic-embed-s `model_quantized.onnx`) + 0.7 MB tokenizer.
- Build: no change to the JS chunks.

## Decisions
- Bake context and the short-verse factor into the matrix, not into runtime code. No data growth and no new code in the worker.
- One matrix serves both verse and root mode. The shipped recipe keeps root mode at or above the baseline (MRR 0.81 → 0.84).
- e5-small-v2 has a higher plain MRR, but its root search is worse (hit@1 66%) and context does not help it.

## Open issues
- The eval is strict: many relevant verses are not in the expected lists, so absolute recall is low. Use the numbers to compare, not as an absolute score.
- Comforting verses for grief (2:156–157, 12:86, 9:40) still rank low. They do not use words like "death" or "grief". A bigger model or a curated topic index would be needed.
- `pnpm models` does not remove old models. On a machine that has MiniLM in `public/models/`, `pnpm build` copies it into `dist` (23 MB unused). Delete `public/models/Xenova/all-MiniLM-L6-v2` on the deploy machine.
- Browsers with the old model cached download the new model (34 MB) once.
- `e2e/semantic.spec.ts` expected the gear label "Meaning"; the UI says "Semantic". Fixed the expectation.
