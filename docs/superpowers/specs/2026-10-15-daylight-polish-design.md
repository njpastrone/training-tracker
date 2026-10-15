# Daylight polish

Date: 2026-10-15 · Status: draft for review
Mockups: "Daylight, refined" row on the LiftText design directions canvas (https://claude.ai/artifact/ML7Z1yCk1yGeQqAAHp2HNL).

## Goal

The app looks generic. Keep Daylight (the user preferred it to five new directions) and fix what makes it generic, so the sky, the week and the numbers carry the brand. Visual only: no new features, no data or navigation changes. The Chat tab idea is a separate follow-up.

## What we heard and saw

Audited in the simulator with five weeks of demo data, light and dark:

1. The sky barely shows in daylight: a pale wash, so light mode reads like any tinted iOS app.
2. Everything is the same white card at the same weight; no screen has one main thing.
3. Two Apple-Fitness-style rings (training, protein) are the most familiar element; Progress needs a caption to explain them.
4. Sunrise orange means action, link, trained, unmet and ring all at once, so it means nothing.
5. Type is flat: one big title, then nearly everything at ~17 pt; numbers aren't the hero.
6. Details: lists clip hard under the chips, the disabled send button is a pink blob, Progress puts tiles inside a card.

## Design

### 1. A stronger sky, as a header

- New `day` stops in `services/sky.ts`: `#7FAEFF → #B5D0FF → #DCE8FF`, ending in `#F4F7FF` by about 45% of the screen. Dawn and dusk get the same treatment: the top stop is the saturated one (dawn `#FFB98F`, dusk `#FF9F72`), fading to the same light base. Night is unchanged.
- A soft radial glow at the top right in every phase (warm white by day, `#2A2766` at night, as today).
- `services/sky.ts` logic and tests are unchanged; only the stops move.

### 2. One sheet instead of many cards

- Each tab is: title and subtitle on the sky, a hero (Log, Progress), then **one sheet** (`SkySheet`, new, in `components/Sky.tsx`): full width, 32 pt top corners, `card` material, hairline top edge. Sections inside it are separated by hairlines, not cards.
- `SkyCard` stays for pushed screens, sheets and empty states; tabs stop stacking cards.
- Rows inside the sheet are plain `Row`/`DayRow` with hairlines (no chevron tiles in tiles).

### 3. The sun arc replaces the rings

- New `SunArc` (`components/SunArc.tsx`, `react-native-svg`): a dotted half-circle over a horizon line; the arc fills in sunrise from the left as training days are done; one dot per target day; the sun (a disc with a halo) sits at the latest done day. Centre: the count, large ("2 of 3"), and "training days this week" under it. Size ~350 × 170 pt on Log. It reads the same numbers `TodayTiles` reads today.
- Reduce Motion: no animation; otherwise the sun springs to its spot on appear (one shot, not looping).
- `Ring` and `TodayTiles` are deleted. `GoalRing` is replaced by `GoalBar` (below).

### 4. Colour jobs

| Colour | Means | Not used for |
|---|---|---|
| `sunrise` | the one action on screen (Start, Plan my week), done (trained day, goal met ✓, the sun) | links, labels, partial progress, unmet goals |
| `text` (ink) | partial progress bars, planned (dashed ring) | |
| `textSecondary` | links ("All days ›", "Edit", "Select"), subtitles | |
| muscle/food dots | identity only | met/unmet |

- `cobalt` is retired for planned; planned is an ink dashed ring. `mint` is retired for met; met is sunrise ✓. (`mint` stays only for the save toast.) Keep the tokens until no screen uses them, then delete.
- Unmet is never coloured: it's grey text ("1/2"), never orange or red.

### 5. Big numbers

- New Paper variant use: `displaySmall` = rounded 900, 56 pt, tabular, for the hero number (Log's "2 of 3", Progress's "2 of 2"). Section numbers ("130 g") use rounded 900 at 34 pt.
- Section labels stay small caps; row titles 17 semibold; secondary 14–15.

### 6. Food goal as a bar, not a ring

- `GoalBar` (`components/GoalBar.tsx`) replaces `GoalRing` everywhere it's used (`TodayTiles`, `DayRow`, `FoodDay`, `GoalsCard`): a 6 pt track with an ink fill toward the target; sunrise fill and a ✓ once met; nothing when there's no food that day.
- In rows (`DayRow`), the bar shrinks to just the number and a ✓ when met ("160 g ✓", "116 g" in grey).
- On Progress, the food row becomes 7 vertical bars (one per day) under a dashed target line, sunrise when met. The explanatory caption goes.

### 7. Details

- **Fade under the chat bar**: a 60 pt gradient from transparent to the sky's base colour above the chips (`ChatBar`/`ChatScreen`).
- **Disabled send**: `dim` fill with a `textTertiary` arrow; sunrise only when there's text.
- **Progress sets**: the tiles-in-a-card grid becomes rows (muscle, bar, "3 / 8"); met rows get a sunrise ✓.
- **Section actions** ("Edit", "Select", "All days") are `textSecondary` text, not sunrise.

## Screens

- **Log**: title, `SunArc`, sheet with Today (plan name large, exercises, Start), food (big grams, `GoalBar`, "30 g to go · kcal · meals"), Recent rows. Matches "Log · refined".
- **History**: title, sheet with the calendar (trained = sunrise disc, planned = ink dashed ring, today = ink ring, food = grey dot), legend, Days rows. Matches "History · refined".
- **Progress**: title, hero number + "goal met ✓", sheet with the muscle grid, protein bars, sets rows. Matches "Progress · refined".
- **Settings**: the sheet replaces its stacked cards; no other change.
- **Day screen and pushed screens**: pick up `GoalBar`, colour jobs and type; layout unchanged.

## Out of scope

The Chat tab and moving Settings to a gear (separate follow-up), new data, copy changes beyond removing the Progress caption, the app icon.

## Docs

Update `DESIGN-SYSTEM.md` in the same change: the new sky stops, `SkySheet`, `SunArc`, `GoalBar`, the colour-jobs table and the removals (`Ring`, `TodayTiles`, `GoalRing`, cobalt for planned, mint for met).

## Testing

- `services/sky.test.mts` must still pass (the logic is unchanged; update only any stop literals it checks).
- A unit test for the `SunArc` geometry helper (done/target → sun position and dot positions, including 0 of N, N of N and done > target).
- Visual check in the simulator per DESIGN-SYSTEM.md's consistency rule: Log, History, Progress, Settings and a day screen at 375 pt, default and largest Accessibility text size, light and dark, plus dawn and dusk skies.
- Contrast: text on the new sky stops at the title position meets 4.5:1 (ink `#0E1430` on `#7FAEFF` is about 8:1).
