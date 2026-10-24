# Finder eval

Checks the "find food near me" prompt (`server/src/finder.ts`, the same code the Worker sends) on real
place lists: what it picks, what it skips, the build it suggests ("no rice", "lettuce wrap"), the verdict
per preference, the numbers against published nutrition for the chain items it tends to pick, the never
list, and that no health claim ever appears in the raw reply. The place lists come from the OpenStreetMap
pulls in `data/lt-food-data/report.md` (Chelsea in Manhattan, Legacy West in Plano, Oneonta NY), plus
single-place cases for the chains with published oils and nutrition, two area-only cases (no place list,
only the words the user typed), and odd inputs (a place name that tries to steer the model, dessert only).

```bash
npm run eval:finder                        # the app's models: Haiku 5.5 thinking off, Sonnet 5.5 when unsure
npm run eval:finder -- --model claude-sonnet-5-5
npm run eval:finder -- --only oils,numbers # categories or case ids
npm run eval:finder -- --cli               # no API key: the model through `claude -p` on your login
npm run eval:finder -- --verbose           # print every failed check with the picks
npm run eval:finder -- --repeat 2
node --import tsx --test evals/finder/score.test.ts   # scorer self-check (also in `npm test`)
```

It needs an Anthropic API key in `ANTHROPIC_API_KEY`, exported or in `.env.eval.local` at the repo root
(git-ignored), except with `--cli`. With `--cli` the CLI can't pin thinking off or the JSON schema, so
the prompt's own "reply with only the JSON object" line does the work; treat those results as close to
production and confirm with an API-key run before release. It calls Anthropic directly, never the Worker.
Each run saves its results to `evals/finder/results/` (git-ignored) and adds its API cost to `results/spend.log`.

## Scoring

Every reply runs the fixed checks, the rules `readFinderReply` holds the app to:

- **readable**: JSON with at least one pick that survives the reader (a listed place, numbers, confidence ≥ 0.4)
- **no health claims**: nothing in the raw reply matches `HEALTH_CLAIM` (blood sugar, glucose, spike, healthy, clean, anti-inflammatory, seed-oil free)
- **places from the list**, **numbers make sense** (80–2,500 kcal, protein under half the calories, $2–60), **why is short and plain**, **best is sure enough** (confidence ≥ 0.6, the escalation bar)
- **never list honoured**: none of the never words anywhere in the raw reply

Plus the case's own: `pickAny` / `bestAny` / `neverPick` / `skipAny` (places), `itemMust` / `itemMustNot`
(the order's build), `verdict` (what a known fact forces: Chipotle's disclosed oils are never a "hit"),
`hitsAtLeast`, and `refs` (published kcal and protein for the items the model tends to pick, within 20% as
in `evals/food`; scored only when a pick matches a reference). A case's score is checks passed ÷ checks run.

**Gates before a prompt change ships:** 0 health claims, 0 never-list slips, 0 places off the list,
"all checks" not lower than the last saved run on the same model.

## Results

Measured 2026-10-24 with `--cli` (the Claude Code login: thinking and the JSON schema not pinned, so
this is close to production, not identical), 38 cases, one run:

| | Haiku 5.5 thinking off, Sonnet 5.5 when unsure |
|---|---|
| Mean score (checks passed ÷ run) | 1.00 |
| Cases passing every check | 97% (37 of 38; the one miss was a scorer nit on "skip the rice, cheese and sour cream", fixed since) |
| Readable, places from the list, numbers make sense, no health claims | 100% each |
| kcal and protein within 20% of published, where a pick matched a reference (4 picks) | 100% / 100% |
| Escalated to Sonnet | 16% (independents, the grocery store, the Korean place, a town with no list) |
| p50 latency | 8.4 s |
| Cost per search (CLI-measured, uncached) | about $0.003 |

Picks matched the report's: Chipotle chicken bowl with no rice and extra beans, a lettuce-wrapped burger
at Five Guys or Shake Shack, CAVA greens bowl, 12-count grilled nuggets at Chick-fil-A (200 kcal, 38 g:
exact), a half rotisserie chicken at the grocery store, eggs and deli turkey with no bread at the
independent deli at confidence 0.4. Chipotle's seed-oil verdict was "miss" every time, Chick-fil-A's
"miss" or "unknown". The never list held in the picks; the one slip was in a skipped place's reason.
Before this set was tuned, the first run found a real reader bug: an order that said "no cheese" was
dropped by a never list holding "cheese" (`withoutNegated` in `server/src/finder.ts` fixes it).
