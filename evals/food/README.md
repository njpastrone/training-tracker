# Food-log parsing eval

Checks how close the food log gets to real macros. A log ("2 eggs, 200g chicken and a cup of rice",
"Big Mac and medium fries", "did legs then had a protein shake") runs through the same code the app
uses: the app's table matching (`services/foods.ts`), the food prompt (`server/src/food.ts`, which the
Worker sends), and the unit math (`services/foodUnits.ts`). The meal's totals are compared with a
reference.

```bash
npm run eval:food                          # dev sets, AI grounded in the USDA table (what the app does)
npm run eval:food -- --set holdout         # the held-out set: report it, never tune on it
npm run eval:food -- --arch alone          # AI alone: no USDA table, the model estimates everything
npm run eval:food -- --local               # the no-AI parser only: free and offline
npm run eval:food -- --cli                 # no API key: the model through `claude -p` on your login
npm run eval:food -- --model claude-haiku-4-5
npm run eval:food -- --only branded,units  # categories or case ids
npm run eval:food -- --verbose             # print every miss with the items it logged
npm run eval:food -- --repeat 2            # average out run-to-run noise
npm run eval:food -- --against evals/food/results/<earlier run>.json   # fixed and broken cases
node --import tsx --test evals/food/score.test.ts                     # scorer self-check
```

A grounded run reports, from the same calls: "AI every log, grounded in USDA" (the app: Haiku 5.5, and
Sonnet 5.5 when `needsEscalation` says Haiku is unsure, with the share escalated), "claude-haiku-5-5
alone" (Haiku's first replies) and "Phone first, then AI" (the phone's parse where it's confident,
`confidentLocal`, else the AI's). `--model` runs one model with no escalation. `FOOD_SYSTEM_FILE=<file>`
tries a system prompt from a file instead of `server/src/food.ts`.

It needs an Anthropic API key in `ANTHROPIC_API_KEY`, either exported or in `.env.eval.local` at the
repo root (git-ignored), except with `--local` or `--cli`. It calls Anthropic directly, never the Worker.
Each run saves its results to `evals/food/results/` (git-ignored) and adds its API cost to
`results/spend.log`.

`--cli` (here and in `npm run eval:parse`) sends the same model, system prompt and message through the
Claude Code CLI (`evals/cli.ts`) on your login; it strips `ANTHROPIC_API_KEY` from the CLI's environment
so it never bills a key. The CLI can't pin temperature or turn thinking off, and adds a few hundred tokens
of its own (measured per model and subtracted; cached and uncached input both count, so $/log is the
uncached price). Treat its results as close to production and confirm with an API-key run before release.

## Scoring

A macro is a hit when the meal total is within 20% of the reference, or within a small floor for small
numbers (25 kcal, 3 g), whichever is looser; the tight bar is 10% (floors 15 kcal, 2 g). Each system
reports the share of logs that hit for calories, protein, carbs and fat at both bars, failed parses,
median latency and cost per log, then calories and protein by category. A case with no reference items
passes only when nothing is logged. Items are not matched one to one: a meal split differently but
adding up right still counts. Cases from the scout's set also show "kcal at its tolerance" (its own
tight/normal/loose bar per case).

## Gold sets

- `cases.ts` (122) and `scout.ts` (the research scout's 199): the **dev** sets, used for tuning.
- `holdout-1.ts`, `holdout-2.ts`, `holdout-3.ts` (340): the **held-out** set, written by three separate
  agents that never saw the app's food code or prompt, the way people text and dictate: slang, typos,
  voice-to-text errors, run-ons, vague amounts, corrections, emoji, other languages and units, brands and
  chains, drinks and alcohol, homemade and international dishes, workout plus food, and no food. Never
  tune on it; report it.

Every reference number has a source: whole foods from USDA FoodData Central (an FDC id and grams),
branded and restaurant food from the brand's published nutrition, homemade dishes from USDA FNDDS
mixed dishes or the sum of their listed ingredients.

## Results

Measured 2026-10-08 with `--cli`. kcal and protein within 20%, kcal within 10%:

| | Held-out (340) | Dev (321) |
|---|---|---|
| Haiku 5.5, Sonnet 5.5 when unsure, tuned prompt (the app) | 85% / 85% / 68% | 92% / 91% / – |
| Same, before tuning | 84% / 85% / 67% | 89% / 90% / – |
| Haiku 5.5 alone, tuned prompt | 84% / 84% / 66% | – |
| Sonnet 5.5 every log, grounded | 85% / 85% / 67% | 89% / 90% / 76% |
| Phone first, then AI, Sonnet 5.5 | 84% / 84% / 67% | 89% / 90% / 75% |
| AI alone, Sonnet 5.5 | 86% / 85% / 65% | 86% / 89% / 70% |
| AI every log, grounded, Haiku 4.5 | 75% / 77% / 62% | 80% / 84% / 67% |
| AI alone, Haiku 4.5 | 66% / 69% / 45% | 75% / 75% / 56% |
| No AI (`--local`) | 40% / 45% / 27% | 61% / 66% / – |

About $0.002 per food log for the app's design uncached (thinking included), $0.008 on Sonnet 5.5 every
log, $0.003 on Haiku 4.5. See FEATURES.md, "Food logging", for categories, cost and what's left.
