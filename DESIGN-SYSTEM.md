# LiftText Design System: Daylight

LiftText is iOS-26-native: content sits on a soft sky, Liquid Glass is used for controls, type is SF Pro Rounded + SF Pro, and you talk to the app through a Messages-style composer.

## Core Principles

1. **The sky is your last 7 days.** It starts at dawn and gets brighter with each workout logged. Your usual week's worth ends in full daylight; falling behind your usual pace turns it dusky. Dark Mode is always night.
2. **Glass for controls, material for content.** Liquid Glass only on the tab bar, composer and floating buttons, never on content (HIG Materials). Content cards are a translucent material over the sky.
3. **System first.** System fonts, SF Symbols, native tabs and sheets. Appearance follows the iPhone; there is no in-app theme setting.
4. **Fluid and physical.** Morph, don't cut. Springs, not linear tweens. Reduce Motion gets crossfades; Reduce Transparency gets solid surfaces.

## The Sky

`services/sky.ts` maps the last 7 days (a rolling window ending today, see `services/pace.ts`) to a sky. It is pure and unit-tested (`services/sky.test.mts`).

- **Target:** distinct planned days in the last 7 days from the schedule. With no plan, the days a week picked in setup or Settings, else the usual weekly count: distinct training days in the 4 weeks before the last 7 days, divided by 4 and rounded (1–7; 3 with no recent history). In a new user's first 7 days after setup (no plan), the target is capped at the days since setup, so day one is dawn and logging that day is full daylight.
- **Done:** distinct days with a logged workout in the last 7 days.
- **Phase:**
  - `day` when done ≥ target;
  - `dusk` when behind pace: with a plan, fewer done than planned days already gone by; without one (and never in a new user's first 7 days), fewer than the weekly target expects for the days counted so far (today counts once trained, days before your first workout never count);
  - otherwise `dawn`, blended toward day by `done / target`.
- **Gradients (top → middle → bottom):** dawn `#FFD3B8 → #FADCE6 → #E4E8FF`, day `#C9DFFF → #E4EEFF → #F6F8FF`, dusk `#FFC39C → #EFB0C8 → #BDB8F0`, night `#0A0F26 → #141938 → #1F1B44` with a `#2A2766` glow at the top right.
- The sky is static per visit: it changes when data changes or the app returns on a new day. No ambient animation.

`ThemeContext` exposes it as `useTheme().sky`. Render screens with `<SkyScreen>` (components/Sky.tsx).

## Colour

Tokens live in `constants/theme.ts` (`lightColors`, `darkColors`); read them with `useColors()`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `text` | `#0E1430` | `#F3F5FF` | Primary text |
| `textSecondary` | `#4A5374` | `#B0B7D6` | Secondary text |
| `textTertiary` | `#6E7798` | `#8189AE` | Labels, hints |
| `card` / `cardLine` | white 62% / 80% | white 7.5% / 13% | Content card material and its edge |
| `glass` / `glassLine` | white 50% / 85% | white 10% / 18% | Glass controls |
| `dim` | ink 6% | white 6% | Tracks, dividers, quiet fills |
| `sunrise` | `#D2441C` | `#FF7F57` | Brand accent, primary actions, logged |
| `sunriseSoft` | `#FF7A4F` | `#FF9D7A` | Gradients, glows |
| `onSunrise` | `#FFFFFF` | `#2A1208` | Text on sunrise (≈4.5:1) |
| `cobalt` | `#3560F0` | `#8EA6FF` | Planned workouts |
| `mint` | `#13865A` | `#52D9A0` | Success |
| `error` / `warning` | `#D70015` / `#B25E00` | `#FF6961` / `#FFB340` | Destructive, caution |
| `background` / `surface` / `border` | `#E4EEFF` / `#F7F9FF` / `#D5DCEF` | `#141938` / `#1C2142` / `#2E3460` | Solid fallbacks (Reduce Transparency, sheets) |

Muscle groups are small coloured dots next to a text label (`muscleGroupColors`), not filled chips.

During the rollout, the old names (`primary`, `secondary`, `success`, `accent`, `primaryLight`, `surfaceVariant`, `borderLight`) are aliases for the tokens above. Don't use them in new code.

## Typography

All system fonts; Dynamic Type and Bold Text work for free. SF Pro Rounded is `fonts.rounded` (`'ui-rounded'` on iOS).

| Role | Font | Paper variant |
|---|---|---|
| Large title (34) | Rounded Heavy | `headlineLarge` |
| Title 1 / 2 / 3 (28 / 22 / 20) | Rounded Heavy / Bold | `headlineMedium` / `headlineSmall` / `titleLarge` |
| Headline (17), buttons | Rounded Bold | `titleMedium`, `labelLarge` |
| Labels (12–13, caps) | Rounded Bold | `labelMedium`, `labelSmall` |
| Body / Subheadline / Footnote (17 / 15 / 13) | SF Pro | `bodyLarge` / `bodyMedium` / `bodySmall` |

Numbers use the rounded font with `fontVariant: ['tabular-nums']`.

## Spacing and Shape

- 8 pt grid. Screen margin `spacing.screen` (20); `spacing.gap` (12) between cards.
- Cards: `radius.card` (26), concentric with the screen corners. Stat tiles `radius.tile` (20). Message bubbles `radius.bubble` (22, with a 6 pt tail corner).
- Controls: 50–52 pt pills (`radius.control`). Touch targets at least 44 pt.
- No heavy shadows. Cards rely on the material; floating glass uses `shadows.float`.

## Components

- **`SkyScreen`** (`components/Sky.tsx`): the sky background plus a top safe area. Native tabs inset the scroll view for the tab bar, so content scrolls under the glass. Pushed screens pass `edges={['bottom']}` (or `[]`) and set `contentInsetAdjustmentBehavior="automatic"` on their scroll view, because their native header is transparent.
- **`LargeTitle`**: the screen's large rounded title and its subtitle line, as the first item in the scroll view (see Consistency).
- **`SkyCard`**: a content card (material over the sky, solid under Reduce Transparency).
- **`SectionLabel`**: the small caps label above a section's card; inside a card only for a sub-part of it.
- **`Pill`** (`components/Glass.tsx`): 50 pt pill button, `filled` (sunrise) for the main action and `glass` for the rest; `size="small"` for chips and inline actions.
- **`GlassSurface`**: Liquid Glass (`expo-glass-effect`) for controls, with a translucent fallback before iOS 26 and a solid one under Reduce Transparency.
- **`Composer`**: the Messages-style glass capsule with a send button. Dictation is the keyboard's mic key.
- **`ChatBar`**, **`ChatScreen`** (`components/ChatBar.tsx`): the one chat bar Log, History and Progress share, pinned above the tab bar (keyboard and safe area handled by `ChatScreen`): suggestion chips (only when something is timely, see Consistency) over a `Composer`. Your message shows as a `UserBubble` and the answer as a card in the page, which hides the rest of the page while it's open. Only the placeholder, chips and what a send does change per tab: Log logs a workout, food, or both from one message ("What'd you do or eat today?"), History plans ("Plan your week…", answered by a `PlanCard`), Progress adds a missed workout ("Forgot something? 'legs on Wed'"). Chips come from `services/suggestions.ts`. While a parsed card is open, the bar fixes it.
- **`Segmented`**, **`HeaderButton`**: a capsule option switch, and an SF Symbol button for the native header.
- **`Field`** (`components/Field.tsx`): a text field on a quiet fill with a small caps label.
- **`Row`** (`components/Row.tsx`): a settings-style row with a symbol tile, title, subtitle and accessory.
- **Progress** (`app/(tabs)/progress.tsx`): a summary first, then a breakdown per kind, then your other goals, then the reference list. "Last 7 days" is one grid card: goal muscles down the side and the last 7 days across, a muscle-coloured dot on each day it was trained and ✓ or "1/2" on the right; then one food-goal row of day rings ("1/6" days met out of days with food). Below it, "Muscles · sets, last 7 days" (a tile per goal muscle: "14 of 8 sets" with a bar and when last trained; one idea per tile, the times-a-week count lives in the grid), "Food · last 7 days" (the average, days at goal, a bar a day of the goal's number with its target as a dashed line, then the other numbers as plain rows: calories, carbs · fat and where the protein came from, or protein and carbs · fat on a Cut or Bulk), "Your other goals" (lift goals with their 4-week trend, "do it often" goals) and "Your exercises". With nothing ever logged, a "Your progress shows up here" card; with history but nothing in the last 7 days, a "Nothing in the last 7 days" come-back card. With no goals, a "Set a weekly goal" prompt takes the grid's place (Each muscle 2× a week, My own goals, Not now; Not now is for good). Tiles are two to a row, one when Dynamic Type is above 130%; labels wrap, nothing truncates. A green edge and a checkmark mark a muscle that met its minimum sets. Room is kept above the grid for the weekly check-in and by the title for Ask.
- **`Ring`** (`components/Ring.tsx`): progress ring or open gauge (`react-native-svg`), sunrise gradient by default.
- **`GoalRing`** (`components/GoalRing.tsx`): the one food-goal mark, the same everywhere (Log 96 pt, the day screen 48, day rows 28, the Progress grid 24). It fills toward the target, is mint on a day that met it and sunrise otherwise, and is a dashed empty circle on a day with no food. With no food goal there's no ring; the number shows as plain text.
- **`DayRow`** (`components/DayRow.tsx`): one even row per day (about 64 pt) for History's Days and Log's Recent: the day and its workout's name, the muscles as dots, then the food line ("1,755 kcal · 3 meals"), with the food goal's number and its ring on the right. The whole row opens the day.
- **`UserBubble`** (`components/Chat.tsx`): your message on the right in sunrise.
- **`ParsedCard`** (`components/ParsedCard.tsx`): the parsed workout reviewed before saving. It shows only what was said: detail is optional, so an exercise with no numbers shows an "Add details" link instead of empty chips. Numbers are tappable chips; values flagged `unsure` (genuine ambiguity the app spots in a first parse, `flagGuesses` in `services/draft.ts`, plus what a typed fix left uncertain; never missing detail) are outlined in warning; a low `confidence` shows a banner asking for a check; Save, Discard and, outside the chat tabs (where the chat bar does it), a **`FixBox`** for typed fixes and questions, with a **`FixReply`** for the answer (or "I didn't change anything") and the one-tap "Call it '…' from now on". The flow lives in `hooks/useLogDraft.ts` (Log, Progress and Add Workout); the workout screen reuses `FixBox` and `FixReply`.
- **`FoodCard`**, **`FoodRows`**, **`FoodDay`** (`components/`): food from the same composer. A message with food in it opens `FoodCard` (or, when it held a workout too, a "Food" part inside the one `ParsedCard`): one row per food with a category dot (`foodCategoryColors`), the name, an amount chip and a unit chip that switches units keeping the weight, and protein and calories on the right. Tap a row for carbs, fat, fiber and the source: USDA rows say which USDA food; the AI's best guesses for branded, restaurant and homemade food get an open ring for a dot and a "≈" on the calories, and their numbers are editable. `FoodDay` is the day screen's Food section: a goal header (the day's `GoalRing` and "88 g protein of 160 g"), carbs and fat as plain text, then the day's food grouped by meal. A meal is one logged message, named by the time it was logged ("Morning · 8:10 am", "Midday", "Afternoon", "Evening") with its protein on the right; each food is one read-only line, and tapping it opens its amount, unit, swap and × in place. Calories get a target only when the food goal is Cut or Bulk; never red, never a grade.
- **Food outside the composer** (one record: a day holds its training and its food): Log opens on two ring tiles, training days in the last 7 and the food goal today; the day screen has a "Training" section (the whole workout) and a "Food" section (by meal); the History calendar puts a small grey dot under a date with food ("Ate" in the legend, "food logged" to VoiceOver) and its Days list is one `DayRow` per day; Progress has a food-goal row in its grid and a "Food · last 7 days" card; Goals has a Food section with the one food goal. **Every food surface is conditional:** it shows only once that food data exists, so someone who never logs food sees no food UI.
- **The food goal**: one at a time, Off, Protein (at least this many grams a day), Cut (calories at or under this) or Bulk (calories at least this), checked on the days with food in the last 7. Whichever number the goal doesn't measure still shows, as a plain number ("88 g protein" next to a calorie ring). Restaurant and homemade foods are estimates, so the Goals screen says to treat calories as a guide.
- **`ExerciseRows`** (`components/ExerciseRows.tsx`): read-only rows (muscle dot, name, numbers) with exercise notes and distance quiet underneath; used by the workout cards.
- **Headers**: pushed screens use the native stack header, transparent over the sky, with a minimal back button (`app/_layout.tsx`).
- **Tab bar**: native tabs (`expo-router/unstable-native-tabs`) with SF Symbols, tinted sunrise, minimising on scroll.
- **Icons**: SF Symbols (`expo-symbols`) for UI icons. AI features (coach, parsing) use the LiftText mark (`components/LogoMark.tsx`). No emoji as icons.
- **Haptics**: `expo-haptics`, success on logging and planning, selection on toggles.

## Motion

- The compose capsule morphs into your message bubble; the parsed card blooms up from it (spring ≈420 ms, damping ≈0.85, Reanimated).
- A warm edge light and a shimmer only while parsing. It is the only looping motion.
- Reduce Motion: crossfades, no glow.

## App Icon and Splash

- Icon: the AI mark below over a dawn sky, with dark (night sky) and tinted variants (`ios.icon` in `app.json`). Sources are in `assets/source/*.svg` (the bubble and barbell layers for Icon Composer in `assets/source/layers/`); render with `rsvg-convert -w 1024 -h 1024`. The AI mark (`components/LogoMark.tsx`, `assets/tab-logo*.png` at 26/52/78 px) is the new "Messages curl" bubble with the "Heavy bar" barbell cut out, one path, `assets/source/logo-glyph.svg`. The app icon uses the same mark.
- Splash: the bubble mark on `#FADCE6`, and on night `#141938` in Dark Mode.

## Consistency

Rules that keep the four tabs one app. Check every UI change against them on a 375 pt iPhone at the default, the largest standard and the largest Accessibility text size, in dark and light.

**Titles and subtitles.** Every tab has a large title and exactly one subtitle line, always present. The title is the tab's name, except Log, which greets you ("Good evening"). The subtitle is one live fact, about 36 characters at most so it fits one line at 375 pt (it may wrap at larger text, never truncate):

| Tab | Subtitle | With nothing to count |
|---|---|---|
| Log | Today's date, "Tuesday, October 6" | (always a date) |
| History | Days logged (workout or food) in the last 7 and training days planned in the next 7, "Last 7: 2 logged · Next 7: 2 planned" | "Nothing logged in the last 7" |
| Progress | The sky's pace, "2 of 3 training days in the last 7" ("3 training days in the last 7 · goal met" once reached) | "No training days in the last 7"; with only food logged, "Protein 136 g a day over the last 7" ("1,826 kcal a day over the last 7" on a Cut or Bulk goal), or "No food logged in the last 7" |
| Settings | The weekly backup, "Backed up Oct 5" | "Not backed up yet" |

Pushed screens follow the same pattern: the thing as the title, one line of context.

**Space.** The first screen of a tab holds the one summary that answers "how am I doing" plus the next thing to do. Only the day screen, where you went for detail, gets cards taller than about 250 pt. A list is one even row per day (about 64 pt). Controls (amounts, units) appear when you tap the thing, not on every row.

**Training, then Food.** Everywhere both show, in the same words and the same order: Training first, Food second, each section only when it has data. Muscles are coloured dots; food categories are coloured dots too, so the two read differently without a switch. There is no Training | Food toggle: a day is one record.

**Section labels** sit outside and above the card they label, with at most one action on the same line (`labelLarge` in sunrise: "Edit", "Select", "Set goals"): 8 pt above the card, 24 pt below the previous one. A label inside a card is only for a sub-part of it.

**Surfaces.** Three, each with one job: a card (`SkyCard`) for a block of content; a tile (`dim` fill, 14 pt corners, clear edge, `mint` when met, `warning` when stale) for grid cells inside a card; a row (`Row`, hairline between rows) for lists inside a card. No card in a card, no glass on content, one idea per card.

**Numbers.** A number earns space only if it changes what you'd do next, and goes in a sentence first (Progress's pace is its subtitle, not a tile). If a tile is ever needed: two to a row at most at 375 pt, one above 130% text, the value states its scale ("2 of 3"), and the label wraps.

**Empty states and prompts.** An empty state is a centered card: SF Symbol (30 pt, sunrise), a `titleMedium` line saying what will show up, one sentence on how, at most one action. A first-use prompt (like goals) is the same card left-aligned at the top of its screen: a filled one-tap setup, a glass "choose my own", and "Not now", which hides it for good. One at a time per screen.

**Chat suggestions** come from the user's own log and plan (`services/suggestions.ts`) and show only when something is timely; otherwise there's no chips row. Log: today's planned workout if it isn't logged ("Today's plan · Legs"), then the two most recent different workouts from the last 4 weeks ("Like Monday · chest, shoulders, biceps +1"); a tap fills the box with the exercises to edit. History: "Repeat this week" and "Next week, N days"; these send. Progress: planned days in the last week with nothing logged ("Log Wednesday · Legs"). New users (under 3 training days) get whole examples instead on Log and the usual plan starters on History. Chips are whole phrases in the user's voice, never fragments; they hide while you type (fix chips on an open card stay); the row runs to the screen edge so a cut-off chip reads as "scroll for more". The placeholder says what the bar does on that tab.

**No text bleed.** Copy we write never truncates: labels, titles, buttons and chips wrap. `numberOfLines` only on text the user typed. A row's right-hand slot holds only small things (chevron, switch, short pill or value); a segmented control or button set goes on its own line under the row's title. If a label doesn't fit, drop a column, not letters. `maxFontSizeMultiplier` only inside fixed shapes (the calendar's day discs).

**Copy.** Plain English, American spelling, second person, sentence case everywhere including alerts. Alert titles say what happened or ask the question ("Couldn't delete the plan", "Skip today's workout?"), never "Error" or "Success". No exclamation marks, no grades, no nagging about missing detail. "This week" is the calendar week; "the last 7 days" is the rolling window. One name per thing: workout, training day, plan, goal; "session" is one exercise on one day.

## Accessibility

- Text on the sky and on cards meets 4.5:1 in both modes; check new colour pairs.
- Never rely on colour alone: logged is a filled circle, planned an outlined ring, today a ring around the date.
- No text bleed: grids get fewer, larger cells instead of truncated labels. Check the smallest iPhone (375 pt) and the largest Dynamic Type size; above 130% a grid becomes a list.
- Respect Reduce Motion and Reduce Transparency (`useTheme().reduceTransparency`).
