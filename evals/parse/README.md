# Workout-log parsing eval

Checks the prompt that turns a free-text log ("hit chess today, bench 3x10 at 135 and some flys")
into structured exercises. The prompt lives in `server/src/parse.ts`. The Worker sends it, the app
sends it to older Workers, and this eval scores it, so the eval always tests the live prompt.

```bash
npm run eval:parse                                  # 101 cases, ~1 min, about $0.20
npm run eval:parse -- --verbose                     # also print every miss
npm run eval:parse -- --only multi_day,terse-bench  # categories or case ids
npm run eval:parse -- --repeat 3                    # average out run-to-run noise
npm run eval:parse -- --set holdout                 # 20 cases never used for tuning
npm run eval:parse -- --set identity                # which exercise each lift is, given a library
npm run eval:parse -- --model claude-sonnet-5-5 --effort low
npm run eval:parse -- --compat                      # what a Worker deployed before parse mode sends
npm run eval:parse -- --set corrections             # typed fixes applied to a draft (correction mode)
npm run eval:parse -- --against evals/parse/results/<earlier run>.json   # list regressions
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
  Past sessions mentioned only for comparison aren't logged.
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
| corrections (12, added 2026-10-05) | | 1.000 (12/12) |

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
Worker's cap of 200 requests a day, that's at most about $1.20 a day.
