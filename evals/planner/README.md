# Planner and template-parser eval

Checks the Worker's pass-through path: the requests where the app sends its own prompt and the Worker
only picks the model (`PASSTHROUGH` in `server/src/index.ts`). Two prompts use it today: the workout
planner (`services/planner.ts`, not yet on a screen) and the Templates screen's "describe it" box
(`parseTemplateFromNL` in `services/claude.ts`). App builds from before parse mode (2026-10-04, between
#6 and #8) also parse logs through it with their own prompt; `legacy.ts` scores that prompt with the
parse eval.

```bash
npm run eval:planner -- --cli                        # 22 cases, ~1 min; the Worker's model and effort
npm run eval:planner -- --cli --verbose              # also print every failed check
npm run eval:planner -- --cli --only tweak,kg-strength
npm run eval:planner -- --cli --repeat 3             # average out run-to-run noise
npm run eval:planner -- --cli --model claude-haiku-4-5-20251001          # the model from before
npm run eval:planner -- --cli --model claude-haiku-5-5 --effort medium
npm run eval:planner -- --cli --against evals/planner/results/<earlier run>.json   # list regressions
npm run eval:parse -- --cli --parser ../planner/legacy.ts --effort low   # pre-parse-mode apps' prompt
node --import tsx --experimental-test-module-mocks --test evals/planner/score.test.ts   # scorer self-check
```

Without `--cli` it needs `ANTHROPIC_API_KEY` (exported or in `.env.eval.local`). `--cli` sends the same
request through the Claude Code CLI on your login (`evals/cli.ts`); the CLI adds a few hundred tokens of
its own context and can't pin sampling, so treat its results as close to production, not identical.
Every run saves its results to `evals/planner/results/` (git-ignored).

## Scoring

Each planner case is a request the Plan screen would send, with the history summary the app builds
(`summarizeHistory`: usual days, recent lifts with their top set, days off, how the last plan went,
units, goals), and for tweaks the draft under review. The reply goes through the app's own reader
(`parsePlannerText`), so an unusable plan scores 0. A usable one runs the fixed checks: reply at most
two sentences, 3-5 chips, only the first week of sessions, no absurd weight (over 700 lbs or 320 kg);
plus the case's own: sessions on the days asked for or the user's usual days, the number of days asked
for, lighter weights after three weeks off, the user's own workouts kept exactly and marked `mine`, a
tweak changing only what was asked (same dates, same lifts), kg numbers for a kg user, at most 5
exercises when 45 minutes is the cap, no barbell lifts with dumbbells only. A template case lists the
exercises its description should give, scored field by field (name, sets, reps, weight, unit).
A case's score is checks passed ÷ checks run, averaged over repeats.

## Results (2026-10-14, 3 runs each, `--cli`)

Scored with the final reader, which forgives one stray closing brace after the JSON object (both
unusable Haiku 5.5 replies were complete plans with `}}` at the end), and the final template prompt.

| model | overall | perfect | unusable | $ per request | p50 latency |
|---|---|---|---|---|---|
| Claude Haiku 4.5 (before) | 0.901 | 10/22 | 3/66 | $0.0056 | 7.0 s |
| **Claude Haiku 5.5, effort low (chosen)** | **0.984** | 17/22 | 0/66 | $0.0011 | 9.3 s |
| Claude Haiku 5.5, effort medium | 0.981 | 18/22 | 0/66 | $0.0014 | 12.1 s |
| Claude Sonnet 5.5, effort low | 0.935 | 17/22 | 3/66 | $0.0402 | 12.9 s |

By category (Haiku 4.5 → Haiku 5.5 low): fresh 0.61 → 0.97, usual 0.91 → 0.98, comeback 0.93 → 0.99,
own workouts 0.97 → 1.00, tweaks 0.94 → 1.00, units 0.96 → 1.00, constraints 0.96 → 0.92, templates
1.00 → 0.98 (1.00 after the prompt line below).

Haiku 4.5's misses are structural: a 6-day bro split with six day types (the app allows five, so the
plan is rejected), two weeks of sessions written out, sessions on the wrong weekdays ("Monday" dated
to a Wednesday), "move Friday to Saturday" moving Tuesday. Haiku 5.5 keeps the dates and day types
right; what it still misses is softer: more than five exercises in a 45-minute day, a barbell lift in
a dumbbells-only week. Sonnet 5.5 at low effort writes the same six-day-type split and sessions off the
usual days, at 37 times Haiku 5.5's cost. Low and medium effort are within noise of each other on this
set, so the cheaper and faster one is used.

The one field Haiku 5.5 read differently in a template: "incline db press 3x10 60s" became 60 seconds
of rest, not 60 lb dumbbells (Haiku 4.5 read the weight). One line in the template prompt's
`parsing_patterns` fixes it (12/12 at low and at medium effort).

Confirmation run of the shipped configuration (Haiku 5.5 low, final prompts and reader, 3 runs,
`--against` the Haiku 4.5 run): overall 0.899 → 0.969, 16/22 perfect, 1 unusable reply in 66 (the
six-day-type bro split, which Haiku 4.5 also wrote all three times). Four cases lost one check on one
of three runs: `repeatWeeks` 4 instead of 6 once, six chips once, six exercises in a 45-minute day,
one barbell lift in a dumbbells-only week. Single-run differences of one check are noise on this set;
the categories that moved are fresh (0.61 → 0.86), comeback (0.93 → 1.00) and tweaks (0.94 → 0.99).

### Pre-parse-mode apps (`legacy.ts`)

The parse eval's 114 main cases through the old app prompt, one run each: Haiku 4.5 0.779, Haiku 5.5
(medium) 0.771. Twenty cases lower, eleven higher; the drops are nearly all chattier workout notes
("Unit not specified; assumed lbs."), not wrong numbers. Those builds existed for a few hours on
TestFlight on 2026-10-04, and every build gets the current JS over the air on launch when its native
fingerprint still matches, so they aren't routed through the parse prompt.
