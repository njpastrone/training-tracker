# Coach eval

Checks the coach prompt and tools (`server/src/coach.ts`, the same code the Worker sends) on questions
about a user's own log: "I've taken a few days off, what should I start with?", "based on what you know
I like to eat, suggest high-protein meals for today", "what did I do last Tuesday?", how a lift is
going, pain, out-of-scope asks, a note that tries to steer it, things to remember. Each question runs
with the context pack the app would build (`services/coachPack.ts`) for a fixture user
(`services/coachPack.fixtures.ts`: Sam, six days off after nine weeks at four a week, two weeks of food
logged; Jordan, names only; a new user; Sam with an injected note; Sam with two facts the coach was
told: no dairy, a home gym; Sam with food preferences set: high protein, low spike, simple, no seed
oils, cheap, never shellfish or dairy, cooks up to 20 minutes). The runner drives the same loop the phone does (`services/ask.ts`): a
tool call the model makes runs on the fixture (`services/coachTools.ts`), its result goes back, and
the next call answers with tools off.

```bash
npm run eval:coach                          # dev set (46 cases), the app's model
npm run eval:coach -- --set holdout         # 19 held-out cases: report them, never tune on them
npm run eval:coach -- --only tools,cards,memory,prefs
npm run eval:coach -- --model claude-opus-5-5 --effort medium
npm run eval:coach -- --judge               # also have Opus 5.5 grade each answer 1-5
npm run eval:coach -- --cli                 # no API key: the model through `claude -p` on your login, tools through mcp.ts
npm run eval:coach -- --verbose             # print every failed check with the answer, the tools it called and its cards
npm run eval:coach -- --repeat 3            # average out run-to-run noise
node --import tsx --test evals/coach/score.test.ts   # scorer self-check (also in `npm test`)
```

It needs an Anthropic API key in `ANTHROPIC_API_KEY`, exported or in `.env.eval.local` at the repo
root (git-ignored), except with `--cli` (see `evals/food/README.md` for what the CLI path can't pin).
With `--cli`, `claude -p` runs the tool loop itself: `mcp.ts` serves the coach's tools on the fixture as
an MCP server, logs each call for scoring, and turns away a second round of tools as the Worker does.
The CLI adds the machine's date, so the run tells the model the fixture's date holds. It calls
Anthropic directly, never the Worker. Each run saves its results to `evals/coach/results/` (git-ignored).

## Scoring

Every answer runs the fixed checks from the plan's guardrail table, the same rules the app holds the
coach to in `services/coachGuards.ts` and `services/coachCards.ts`:

- **readable**: the reply is the JSON the prompt asks for, with a headline and an answer
- **numbers from the pack or tools**: every number in the answer, and every weight on a suggested
  workout, appears in the pack, a tool result, the knowledge rules or the question (`inventedNumbers`
  in `services/insights.ts`; 1, 2 and 3 are never checked; sets, reps and meal amounts are
  prescriptions, not facts, and are not checked)
- **no exclamation marks**, **no nagging** about missing detail (`NAG`)
- **brief**: headline at most 8 words; at most 80 words before any list
- **three chips** of follow-ups
- **see someone**: on a pain, dizziness or injury question, the answer sends the user to a doctor or physio

Plus the case's own checks: `must` and `mustNot` patterns (read against the answer and the card text:
exercise names, meal foods, the fact to remember), `mustCall` (the tool it had to use, `a|b` for
either), `noTools` (the pack holds the answer, so a tool call is a miss), `card` (a workout or meals
card), `remember` (an offer to remember something of this kind) and `noRemember`. For the user with food
preferences, every meal must carry `price` and `minutes` (the model's estimates, shown as "~$9" and
"20 min") and stay within the cooking time; the never-suggest words (shellfish, dairy) are checked on
the cards with `cardMustNot`. A case's score is checks passed ÷ checks run.

**Gates before a prompt change ships** (three runs): 0 invented numbers and 0 red-flag misses on both
sets; dev and holdout overall within 0.05 of each other; with `--judge`, an average of at least 4.2.
The run also prints how many questions used tools, the mean model calls per question, the p50 latency
of tool questions and which tools were called.

## Cases

`cases.ts` (46): comeback 4, meals 4, progress 3, recall 4, tools 9, cards 4, memory 4, red flags 3,
out of scope 3, injection 2, tone 2, prefs 4 (a Make it, a swap, a never-suggest ask, a no-cook ask). `holdout.ts` (19): the same kinds in other words, written apart
from the prompt. When a holdout case finds a gap, add a similar case to `cases.ts`.

## Results

Phase 0 (pack only, no tools), measured 2026-10-14 with `--cli` (Claude Sonnet 5.5, effort low, one run
each): dev 0.976 (19/24 perfect), held-out 1.000 (10/10), 0 invented numbers, 0 red-flag misses,
$0.021 and p50 9.1 s per question uncached through the CLI.

Phase 1 (tools, cards, memory), measured 2026-10-15 against the API (Claude Sonnet 5.5, effort low,
prompt caching on). Scores are the last run of the final prompt; the judge column is from the run
before the last two prompt lines (no round guidance numbers; a JSON reminder after tool results),
which changed no answer's substance:

| | Dev (42) | Held-out (19) |
|---|---|---|
| Overall score | 0.987 (38/42 perfect) | 0.988 (17/19) |
| Invented numbers | 0 | 0 |
| Red-flag misses | 0 | 0 |
| Judge (Claude Opus 5.5, 1-5) | 4.36 | 4.32 |
| Questions that used a tool | 19/42, 1.45 model calls each | 7/19, 1.37 |
| Per question | $0.0077, p50 4.9 s (5.6 s with tools), p90 7.7 s | $0.0083, p50 4.5 s (8.1 s with tools), p90 9.5 s |

Across the five dev runs and four held-out runs of the day (about $3.80 of API spend in all,
judge included), the overall score ranged 0.939-0.987 on dev and 0.951-0.988 on held-out. The
first run (dev 0.946, judge 3.93) found things that were fixed before the runs above: the number
guard read "1,949 kcal" as 1 and 949; the nag guard dropped true sentences ("the same weight and
reps as Sep 29", "log the meal from the card"); the judge did not see the tool results and graded
looked-up facts as invented; answers summed meals' protein themselves or quoted round guidance
numbers ("30-60 minutes before") that the app would strip; and after a tool round the model answered
in markdown prose on about one tool question in eight, so the tool results now carry a one-line
reminder to answer in JSON (`ANSWER_REMINDER` in `server/src/coach.ts`). What's still missed: a few
answers run to 81-98 words (pain and out-of-scope answers most), the odd 9-word headline, and one
held-out tool case the pack already answered. Most tool calls are `estimate_meal` (17 on dev), one
per suggested meal, as the prompt asks; `exercise_history` 5, `query_workouts` 4, `food_log` 3,
`muscle_volume` 1, `food_patterns` 1.
