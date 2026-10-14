# Workout-log parsing eval

Checks the prompt that turns a free-text log ("hit chess today, bench 3x10 at 135 and some flys")
into structured exercises. The prompt lives in `server/src/parse.ts`. The Worker sends it, the app
sends it to older Workers, and this eval scores it, so the eval always tests the live prompt.

```bash
npm run eval:parse                                  # 109 cases, ~1 min, about $0.50
npm run eval:parse -- --verbose                     # also print every miss
npm run eval:parse -- --only multi_day,terse-bench  # categories or case ids
npm run eval:parse -- --repeat 3                    # average out run-to-run noise
npm run eval:parse -- --set holdout                 # 20 cases never used for tuning
npm run eval:parse -- --set identity                # which exercise each lift is, given a library
npm run eval:parse -- --model claude-sonnet-5-5 --effort low
npm run eval:parse -- --compat                      # what a Worker deployed before parse mode sends
npm run eval:parse -- --set corrections             # typed fixes and questions about a draft (correction mode)
npm run eval:parse -- --cli                         # no API key: the model through `claude -p` (see evals/food/README.md)
npm run eval:parse -- --against evals/parse/results/<earlier run>.json   # list regressions
npx tsx evals/parse/compare.ts <parserA> <modelA> - <parserB> <modelB> -   # 30 messy logs side by side, no scoring
node --test evals/parse/score.test.ts               # scorer self-check
node --test evals/parse/recall.test.ts              # offline, free: is the right exercise a candidate?
```

It needs an Anthropic API key in `ANTHROPIC_API_KEY`, either exported or in `.env.eval.local` at the
repo root (git-ignored). It calls Anthropic directly, never the Worker, so it doesn't use up the
app's daily cap. Each run saves its full results to `evals/parse/results/` (git-ignored).

**Before changing the prompt:** run it with `--repeat 3`, make the change, run it again with
`--against` pointing at the first run, and ship only if the score rose and nothing regressed. Keep
`holdout.ts` for spot checks only. If it finds a gap, add a similar case to `cases.ts`.

## Scoring

Each case lists the exact result expected (`cases.ts`). Every field that is set in either the expected
or the actual exercise is worth one point: name (or, when the case gives one, the exercise `id`
instead: identity, not spelling), muscleGroup, sets, reps, weight, unit, duration,
distance (compared in metres, so 5 km = 5000 m) and dayOffset. Each expected note keyword is also a
point. An invented value or an extra exercise costs points, and a correct "nothing here" is free.
Workout notes must contain the expected keywords, or must be empty when the case expects none.
muscleGroups scores by overlap. A case's score is points ÷ possible points. A non-workout passes
only with zero exercises.

Exercises can also expect a `status` (a point) and the user's words, `said` (a point). `ids` lists
other acceptable best guesses for an ambiguous word; a guess from that list is judged as that
exercise, muscle group included. Every run also prints the identity headline:

- **silent mismatches**: a confident pick (known or new-for-you) of the wrong exercise. Release
  gate: **0**, on every set.
- **needless flags**: unsure where nothing was ambiguous. Target ≤ 5%.
- **wrongly new**: a new exercise proposed where a known id was expected. Target 0.

## Identity set

`identity.ts` (54 cases) checks which exercise each lift is. Each case can give the user's library
(their exercises, most recent first, with remembered aliases). Statuses: `known` (in the library),
`new-for-you` (a catalog exercise they haven't logged), `new` (neither: the user confirms the
proposed name later) and `unsure` (flagged for the user, never counted in PRs until confirmed).
Groups: many wordings of one lift, lookalikes kept apart (incline DB vs bench, chin-ups vs
pull-ups, knee vs leg raises, assisted pull-ups…), modifiers and machine brands as notes, the
library first, new exercises that must not become the nearest catalog entry, ambiguous words,
slang, typos and an injection attempt, and logs of names only (a complete log: missing numbers
never make an exercise unsure).

## Parsing contract

These rules are what the expected results encode. The prompt states them too.

- **Exercises**: the app sends a candidate list with each log (`server/src/identity.ts`): the
  user's own exercises, then catalog entries (`data/catalog.ts`) the log mentions, including typos,
  past tenses and every variant of each hit. The model returns, per exercise, the user's words
  (`said`) and the key of the same exercise (`ex`, e.g. `e3`), a second choice (`alt`) when two
  could be meant, or `ex: null` with a standard name. `finalizeParse` then checks every pick in code:
  the key must exist, the user's alias table wins, `said` must be in the log, marker words (incline,
  DB, smith, single-arm, assisted, front, sumo…) must agree with the pick, and an ambiguous word
  ("rows", "curls", "dips") only maps on its own when the user has exactly one such exercise.
  Anything that fails is `unsure`. The muscle group comes from the exercise, not the model.
  Modifiers, grips, attachments and machine brands are notes on the base exercise.
- **Sets/reps**: reps without a set count means 1 set. A weight alone ("bench 225") means sets and
  reps are unknown. A rep range keeps the lower number, and the range goes in notes. Warm-ups aren't
  logged. Self-corrections win.
- **Sets that differ** in weight or reps become separate entries of the same exercise, in order.
  Identical sets in a row merge ("225x5, 225x5, 245x3" → 2x5@225 + 1x3@245). This covers drop sets
  and pyramids too. Other per-set details (belt, wraps) stay on one entry as notes.
- **Weight** is per dumbbell. Plate math is done ("2 plates" = 225 lbs). An unstated unit means
  the user's default unit (Settings). A stated unit is never converted. Bodyweight, assistance and
  machine stack numbers aren't weights, so they go in notes.
- **Cardio**: duration in minutes ("7:45" = 7.75), distance plus `distanceUnit` (mi/km/m), sets
  only for intervals. Timed sets ("plank 3x60s") record duration per set.
- **Supersets/circuits**: one entry per exercise, with the pairing in each entry's notes.
- **Body part only** ("legs", "hit chest and back"): one generic entry per part ("Leg Workout").
  `muscleGroups` lists every group the part covers. These entries are never added when real
  exercises are named.
- **Several days in one message**: each exercise gets a `dayOffset` (0 = the logging date, -1 =
  yesterday, weekday names = their most recent occurrence). The app saves one workout per day.
  Past sessions mentioned only for comparison aren't logged; ones added late ("forgot to log
  Tuesday", "the 28th") are, even when they name only body parts.
- **Information that doesn't fit the schema is never dropped silently**. Workout `notes` take how it
  felt, pain or injury, PRs, sleep, body weight, training partner, gym conditions, total time, and
  skipped or planned exercises. Exercise `notes` take technical details: superset pairing, RPE,
  tempo, pauses, rest, failure, each side, grip, machine settings; distances go in `distance` +
  `distanceUnit`. Notes stay empty when the log says nothing beyond the fields. The app shows exercise
  notes and distance on the review card, the workout cards and the workout screen.
- **Corrections** (`corrections.ts`): the app sends the draft under review plus the user's typed fix
  (`buildCorrectionRequest`). The model returns the whole workout with only the fix applied, scored
  like a parse against the expected full result. A correction also returns `unsure`, the values it
  couldn't be sure of, as `{ exercise, field }`; the review card highlights them (not scored).
  A fix can be a question ("is pec deck the same as machine flys?"): the draft must come back
  unchanged with a `reply`, and `callIt` names the exercise the user knows by other words. Each
  case scores a point for a reply exactly when it asks, and one for `callIt` exactly when expected.
  The parse prompt doesn't ask for `unsure`: every wording tried cost 0.003 to 0.007 on the main
  set (3 runs each), so the app flags genuine ambiguity in code instead (`flagGuesses` in
  `services/draft.ts`: an exercise the log doesn't name, a weight or rep count not in the log, a
  weight with no unit, a day not stated), alongside `confidence` (a low score shows a "check this"
  banner). Missing sets, reps or weight are never flagged: detail is optional.
- **Not a workout** (greetings, questions, food, rest days, future plans, "did my usual",
  instructions to the model): no exercises, so the app shows "Could not understand".

Schema additions this needed: `Exercise.distanceUnit` (distance existed but its unit was
ambiguous) and `dayOffset` on parsed exercises (the app turns it into a date and doesn't store it).

## Identity contract results (2026-10-05, Claude Haiku 4.5, 3 runs averaged)

| set | score | silent mismatches | needless flags | wrongly new |
|---|---|---|---|---|
| main (101) | 0.996 (0.998 before) | 0 | 0 / 582 | 0 |
| identity (52) | 1.000 | 0 | 0 / 165 | 0 |
| holdout (20, 1 run) | 1.000 | 0 | 1 / 34 | 0 |

Offline recall (`recall.test.ts`): every expected exercise in all three sets is in its candidate
list (about 13 candidates on average, at most 40). A live parse costs about $0.0050 against $0.0058
before: the 102-entry exercise list left the prompt. The main set's misses are the model's, not
identity's: plate math on one leg press, a logged warm-up set, a feeling put in exercise notes and
a restated workout note. Two contract rules now hold in code whatever the model writes: assistance
is never a weight (it goes in notes), and identical sets in a row of the same exercise merge.

## Results (2026-10-05, Claude Haiku 4.5, 3 runs averaged)

| category | baseline | final |
|---|---|---|
| terse (10) | 0.854 | 1.000 |
| rambling (9) | 0.871 | 0.995 |
| missing details (8) | 0.760 | 1.000 |
| slang & typos (10) | 0.839 | 1.000 |
| cardio + lifting (7) | 0.737 | 0.986 |
| supersets (6) | 0.749 | 0.989 |
| per-set variation (7) | 0.451 | 1.000 |
| out-of-schema info (12) | 0.809 | 1.000 |
| several days (8) | 0.775 | 1.000 |
| kg vs lbs (9) | 0.825 | 1.000 |
| body part only (5) | 0.373 | 1.000 |
| nonsense (9) | 1.000 | 1.000 |
| **overall** | **0.779 (9/100 perfect)** | **0.998 (97/100 perfect)** |
| holdout (20) | 0.690 (2/20) | 1.000 (20/20) |
| corrections (12, added 2026-10-05) | | 1.000 (12/12); with exercise identity: 1.000, 0 silent mismatches, 3.5% needless flags |

Baseline is the prompt from before this eval (`services/claude.ts` at 86645ec), scored with the same
cases. Its biggest gaps: sets with different weights collapsed into one, no distances, everything
logged as today, body-part-only logs, secondary muscles added to muscleGroups, and notes that
restated the workout.

What's still missed: Kettlebell Swings come back as `full_body` rather than `glutes` in 2 cases,
which is a judgement call where models disagree. In 1 case a single "2 mile cool down jog" gets
`sets: 1` where none was given.

The prompt's examples avoid the test set's wording, so the main score isn't inflated by copied
answers. When an earlier draft did copy test phrases, rewording them dropped the score from 0.999 to
0.992, and general rules then brought it back.

Several categories have small headroom left. Where a change gets the last case, keep it only if
it holds over `--repeat 3`. Single-run differences of one case are usually noise.

Model comparison (final prompt, 100 cases; Haiku averaged over 3 runs, the others 1 run each):

| model | score | perfect | $ per request | p50 latency |
|---|---|---|---|---|
| Claude Haiku 4.5 (chosen) | 0.998 | 97 | $0.0058 | 1.7 s |
| Claude Sonnet 5.5, effort low | 0.999 | 98 | $0.0146 | 2.0 s |
| Claude Opus 5.5, effort low | 0.998 | 99 | $0.0293 | 2.9 s |

Haiku is within one case of the larger models at 40% of Sonnet's cost and 20% of Opus's, with the
lowest latency, so it stays. Structured outputs (`output_config.format` with a JSON schema) were
tried on an earlier version of this prompt and scored lower (0.993 against 0.998: they split "wraps
on the last two" into two entries). Plain JSON had no parse failures across
1,000+ calls and prompt-injection probes, and it sends the same request through old and new Workers.
A Worker deployed before parse mode, which drops `temperature: 0`, scores 0.995 (`--compat`).

Cost: a full 100-case run is about $0.20 with the eval's prompt caching, or $0.57 uncached. A live
parse costs about $0.0058 (4.9k input tokens), against $0.0032 for the old, shorter prompt. At the
Worker's global cap of 450 requests a day, that's at most about $2.60 a day.

## Haiku 5.5 is the parser (2026-10-14, 3 runs averaged, `--cli`)

Haiku 4.5 is still active on Anthropic's model deprecations page, but its retirement commitment
("not sooner than October 15, 2026") ends the day after this was measured and the models overview
already lists it under legacy models, so the parser had to come off it. Gate: every set equal or
better than Haiku 4.5, 0 silent mismatches. Haiku 5.5 at its default effort (medium) with the
rules below passes it; Haiku 5.5 at effort low and Sonnet 5.5 don't.

| set | Haiku 4.5, old prompt | **Haiku 5.5 medium (shipped)** | Haiku 5.5 low | Sonnet 5.5 low (1 run) |
|---|---|---|---|---|
| main (114) | 0.990 (105 perfect) | **0.998** (110) | 0.992 (100) | 0.999 (113) |
| identity (54) | 1.000 (54) | **1.000** (54) | 0.997 (53) | 1.000 (54) |
| corrections (19) | 0.998 (18) | **1.000** (19) | 0.998 (17), 1 silent mismatch | 0.995 (17) |
| holdout (20) | 0.993 (18) | **1.000** (20) | 0.992 (19) | 1.000 (20) |
| silent mismatches | 0 | **0** | 1 | 0 |
| $ per live parse, uncached | $0.0052 | **$0.0010** | $0.0008 | $0.0139 |
| $ per live parse, cache hit | n/a | **$0.0005** | $0.0004 | $0.0044 |
| p50 latency | 1.7 s (API) | 5.7 s | 5.0 s | 4.2 s |

Latencies are through `claude -p`, which adds its own overhead; the API is faster.

What changed for Haiku 5.5, each rule aimed at a failure it had with the old prompt (identity 0.979):
- "60s" after a lift's sets and reps is the dumbbell weight, never seconds or rest; "21s" on curls
  is the 21-rep scheme. Before: five identity cases lost their weight to "60s rest".
- A plate count is a weight, never a set count ("2 plates for 5" was 2 sets).
- Food, drinks and shakes never go in notes: the food parser logs them. Before: 3 of 5 mixed logs.
- Laps and lengths are not sets or reps. Split and place labels ("chest day", "on the track") and
  hedges ("mainly") are not notes. Technical details stay on the exercise, not in workout notes.
- `alt` only when a word really fits two listed exercises: a typo of one name, or a word that fits
  one of "Yours", is that exercise alone. Before: "bench" with Dumbbell Bench Press in the library
  and "dumbell bentch press" came back `unsure`.
- A single timed hold is sets 1; "skipped rope" is Jump Rope (Sonnet read it as skipped); a failed
  attempt is its own entry; sets listed after a body part with no exercise named are that part's
  main lift (hand-compare misses, below).
- A correction with no exercise named applies to the exercise just asked about, and a question
  with a fix still gets its reply.
- The reply is asked for as bare JSON (Haiku 5.5 wrapped it in markdown fences, which parsed fine
  but cost tokens).
- In code, whatever the model writes: a weight equal to a "stack N" or "pin N" in the exercise
  notes is dropped (Haiku 5.5 at low effort put the pin number in both).

The request also changed: no `temperature` (5.x models take only their default), `max_tokens` 4096
because thinking counts toward it (median 280 thinking tokens on identity, up to about 1,700 on long
logs; only tokens used are billed), `output_config.effort: medium`, and the Worker caches the system
prompt like the food one. Effort low skipped thinking altogether (median 0) and was worse on every
set: names-only logs got `sets: 1`, body-part logs lost their muscle groups, "forgot to log" became a
note, and one rename came back as the wrong exercise.

Haiku 5.5 then Sonnet 5.5 when unsure (the food parser's scheme) was simulated from these runs:
sending to Sonnet every reply with confidence under 0.8 or any `unsure` exercise escalates 10 to
34% of logs and changes no set's score, so the parser stays single-model.

Still missed, across models: Kettlebell Swings and Deadlift muscle groups (judgement calls), one
clock time rounded (24:10 as 24.1 rather than 24.17), and `callIt` quoting "pec deck machine flys"
rather than "machine flys" (Haiku 4.5 does the same).

Hand-reading 30 messy logs (`evals/parse/compare.ts`: voice-style run-ons, "5 5 4" rep lists,
plates, 21s, stacks, laps, supersets, food, several days, an injection attempt) side by side with
Haiku 4.5 on the old prompt: Haiku 5.5 was better on 7 (split "185 for 5 5 4" into 2x5 + 1x4, no
invented set count on "3 plates a side x12", food kept out of notes, the user's own Dumbbell Bench
Press picked over a catalog Bench Press, "plank 3x60s" as 1 minute not 0.5, every group on an
"upper body" entry, sure of a bench after an injection attempt) and worse on 3 before the last three
rules above ("curls 21s" as 21 lbs, an unnamed "chest day: 225x5..." list dropped, a failed attempt
folded into notes); equal on the rest.

These runs went through `claude -p` (no eval API key was available; costs are from measured token
counts at list prices, $0 of the eval budget spent). Confirm with an API-key run before relying on
the exact numbers.

## Haiku 5.5 and Sonnet 5.5 with the old prompt (2026-10-13, 3 runs averaged, `--cli`)

Tried to cut the cost per parse by moving to a 5.x model with the system prompt cached (Haiku 4.5
can't cache it: the parse prompt is about 3,360 tokens and the correction prompt about 3,850, under
its 4,096-token minimum). Gate: every set equal or better, 0 silent mismatches. Both lost, so the
parser stays on Haiku 4.5.

| set | Haiku 4.5 (kept) | Haiku 5.5, effort low | Sonnet 5.5, effort low |
|---|---|---|---|
| main (114) | 0.990 (105 perfect) | 0.993 (106) | 0.997 (109) |
| identity (54) | 1.000 (54) | **0.979** (47) | **0.998** (53) |
| corrections (19) | 0.998 (18) | 0.998 (17) | 0.999 (18) |
| holdout (20) | 0.993 (18) | 0.995 (18) | **0.975** (19) |
| silent mismatches | 0 | 0 | 0 |
| $ per live parse, uncached | $0.0052 | $0.0008 | $0.0124 |
| $ per live parse, cache hit | n/a | $0.0004 | $0.0044 (cache write $0.0146) |

What got worse, and held across all 3 runs:
- Haiku 5.5 drops the weight when it is written as "60s" ("incline DB bench 3x10 60s" became 60s
  rest, and the same with "30s", "40s" and "60s" in four more cases), counts "benched 2 plates for 5" as 2 sets,
  puts food into the workout notes in 3 of 5 mixed logs, and marks a known exercise "unsure".
  Effort medium didn't fix it (identity 0.983).
- Sonnet 5.5 reads "skipped rope 3x2min" as not having done it, losing the exercise, and marks
  the same known exercise "unsure". On a cache miss it also costs about 3 times what Haiku 4.5 does.

Hand-reading 30 cases side by side (slang, supersets, units, per-set weights, new and look-alike
exercises, corrections and questions): Haiku 5.5 was worse on 2 (the "60s" weight and "2 plates
for 5"). Sonnet 5.5 was worse on 1 (it added "Skipped tricep pushdowns" to the notes when told to
drop them).

These runs went through `claude -p` (no API key was available), which can't pin Haiku 4.5's
`temperature: 0` and adds its own context; costs are from the measured token counts at list prices.
Haiku 5.5 may well pass with a prompt tuned for it, as the food prompt did; that's the next step.
