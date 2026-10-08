# Food-log parsing eval

Checks how close the food log gets to real macros. A log ("2 eggs, 200g chicken and a cup of rice",
"Big Mac and medium fries", "did legs then had a protein shake") runs through the same code the app
uses: the app's table matching (`services/foods.ts`), the food prompt (`server/src/food.ts`, which the
Worker sends), and the unit math (`services/foodUnits.ts`). The meal's totals are compared with a
reference.

```bash
npm run eval:food                          # 122 cases, Haiku 4.5, about $0.35 (scout set: $0.55)
npm run eval:food -- --hybrid              # what the app does: the phone's parse when confident, AI for the rest
npm run eval:food -- --local               # the no-AI parser only: free and offline
npm run eval:food -- --cli                 # no API key: the model through `claude -p` on your login
npm run eval:food -- --only branded,units  # categories or case ids
npm run eval:food -- --verbose             # print every miss with the items it logged
npm run eval:food -- --set scout           # the research scout's 199-case gold set (evals/food/scout.ts)
npm run eval:food -- --repeat 2            # average out run-to-run noise
npm run eval:food -- --against evals/food/results/<earlier run>.json   # fixed and broken cases
node --import tsx --test evals/food/score.test.ts                     # scorer self-check
```

It needs an Anthropic API key in `ANTHROPIC_API_KEY`, either exported or in `.env.eval.local` at the
repo root (git-ignored), except with `--local` or `--cli`. It calls Anthropic directly, never the Worker.
Each run saves its results to `evals/food/results/` (git-ignored) and adds its API cost to
`results/spend.log`.

`--cli` (here and in `npm run eval:parse`) sends the same model, system prompt and message through the
Claude Code CLI (`evals/cli.ts`). The CLI can't pin temperature and adds a few hundred tokens of its
own (subtracted from the reported tokens), so treat its results as close to production and confirm
with an API-key run before release.

## Scoring

A macro is a hit when the meal total is within 20% of the reference, or within a small floor for small
numbers (25 kcal, 3 g), whichever is looser. Each category reports the share of logs that hit for
calories, protein, carbs and fat, and for all four at once. A `not_food` case passes only when nothing
is logged. Items are not matched one to one: a meal split differently but adding up right still counts.

The run also prints where the items' numbers came from (USDA table or AI estimate), what the router
would do (would the app call the food parser, and the workout parser too), the cost of one food parse
(no prompt caching, like the Worker) and its latency.

## Gold set

`cases.ts`: realistic logs and their reference macros, with a source for every number. Whole foods are
computed from USDA FoodData Central directly (not from the app's table), branded and restaurant food
from the brand's published nutrition, homemade dishes from USDA FNDDS mixed dishes. Categories:
simple meals, unit edge cases, names with no amount, branded, restaurant, homemade, workout plus food,
messy or voice-dictated logs, and logs with no food. `scout.ts`: the research scout's set (199 cases,
18 categories, its own tight/normal/loose tolerance per case, shown as "kcal at its tolerance").

## Results

RESULTS_PLACEHOLDER
