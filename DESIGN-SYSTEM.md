# LiftText Design System: Daylight

LiftText is iOS-26-native: content sits on a soft sky, Liquid Glass is used for controls, type is SF Pro Rounded + SF Pro, and you talk to the app through a Messages-style composer.

## Core Principles

1. **The sky is your last 7 days.** It starts at dawn and gets brighter with each workout logged. Your usual week's worth ends in full daylight; falling behind your usual pace turns it dusky. Dark Mode is always night.
2. **Glass for controls, material for content.** Liquid Glass only on the tab bar, composer and floating buttons, never on content (HIG Materials). Content cards are a translucent material over the sky.
3. **System first.** System fonts, SF Symbols, native tabs and sheets. Appearance follows the iPhone; there is no in-app theme setting.
4. **Fluid and physical.** Morph, don't cut. Springs, not linear tweens. Reduce Motion gets crossfades; Reduce Transparency gets solid surfaces.

## The Sky

`services/sky.ts` maps the last 7 days (a rolling window ending today, see `services/pace.ts`) to a sky. It is pure and unit-tested (`services/sky.test.mts`).

- **Target:** the days a week picked in setup, Settings or Goals. With none picked and a plan in the last 7 days, the plan's week: distinct planned days in the 7 days from its first planned day in the last 7 (or the days trained, if more); else the usual weekly count: distinct training days in the 4 weeks before the last 7 days, divided by 4 and rounded (1–7; 3 with no recent history). In a new user's first 7 days after setup (unless a plan sets the target), the target is capped at the days since setup, so day one is dawn and logging that day is full daylight; with days a week picked, it is capped instead at the days left in the setup week (setup day through Sunday) and is the full picked target from the next Monday, so picking 4 on a Monday and training once is 1 of 4.
- **Done:** distinct days with a logged workout in the last 7 days.
- **Phase:**
  - `day` when done ≥ target;
  - `dusk` when behind pace: with a plan and no days a week picked, fewer done than planned days already gone by; otherwise (and never in a new user's first 7 days), fewer than the weekly target expects for the days counted so far (today counts once trained, days before your first workout never count);
  - otherwise `dawn`, blended toward day by `done / target`.
- **Gradients (Classic's, palette G, top → middle → low → base; Deep and cool has its own in `constants/palettes.ts`):** dawn `#FFB4A0 → #F9CFE0 → #E8E0FA → #F8F6FF`, day `#8AA8FF → #BCC9FF → #E0E3FF → #F6F5FF`, dusk `#FF9F7E → #E7A6CF → #C9BDF2 → #F3F1FF`, night `#0D0B2A → #1A1640 → #2A1F52 → #1E1A44`. The gradient reaches the base at 45% of the screen and the base fills below it. A glow at the top right in every phase: warm white by day, `#2A2766` at night. Title and subtitle text on every stop meets 4.5:1 (`services/sky.test.mts`).
- The sky is static per visit: it changes when data changes or the app returns on a new day. No ambient animation.

`ThemeContext` exposes it as `useTheme().sky`. Render screens with `<SkyScreen>` (components/Sky.tsx).

## Colour

Colours come in **palettes** (`constants/palettes.ts`): one scheme is a name, a light and a dark set of the tokens below, the sky's four gradients and the glow at the top of a screen. Settings › App colours switches schemes live (`settings.palette`, on the phone only); `ThemeContext` hands the chosen one out, so read tokens with `useColors()` (or `useTheme().palette` for the sky and glow) and never import a colour directly. Two ship: **Classic** (the default: coral Training, mint Food, the Daylight sky) and **Deep and cool** (deep indigo Training, teal Food, a cool sky, near-navy at night). Both pass WCAG AA on every text pair (`data/lt-ui-b/report.md`, round 6 finals), which is why Classic's heroes hold their light end where white text still reads. **To add a palette:** copy an entry in `PALETTES`, give it an id and name, change the values and keep every token (`services/palettes.test.mts` fails on a missing one), add the id to `PaletteId`, and check every text pair in both modes against 4.5:1 (3:1 for the 14 pt bold disc numbers). The table shows Classic.

| Token | Light | Dark | Use |
|---|---|---|---|
| `text` | `#0E1430` | `#F3F5FF` | Primary text |
| `textSecondary` | `#3E4766` | `#B0B7D6` | Secondary text, links and section actions ("All days ›", "Edit") |
| `textTertiary` | `#5F6889` | `#8E96BD` | Labels, hints |
| `card` / `cardLine` | white 62% / 80% | white 7.5% / 13% | Content card material and its edge |
| `glass` / `glassLine` | white 50% / 85% | white 10% / 18% | Glass controls |
| `dim` | ink 6% | white 6% | Tracks, dividers, quiet fills |
| `sunrise` | `#C93F17` | `#FF7F57` | The one action on a screen, and done: a trained day, a goal met ✓, the sun. Never links, labels, partial progress, unmet goals or your messages |
| `indigo` / `onIndigo` | `#5534C8` / `#FFFFFF` | `#A995FF` / `#0A1030` | You: your messages, the selected tab |
| `sunriseSoft` | `#FF7A4F` | `#FF9D7A` | Gradients, glows |
| `onSunrise` | `#FFFFFF` | `#2A1208` | Text on sunrise (≈4.5:1) |
| `cobalt` | `#3560F0` | `#8EA6FF` | AI notes and date tags in parsed cards (planned is an ink dashed ring now) |
| `mint` | `#13865A` | `#52D9A0` | Only the checkmark in the save and undo toasts |
| `trainA` / `trainB` / `trainSoft` | `#AE3410` / `#C73F15` / coral 16% | `#A12E0B` / `#C0471A` / coral 20% | Training's hue: the hero gradient's two ends and the glow at the top of the tab. `sunrise` is its flat colour (the tab icon, the send button, ✓ in the grid) |
| `food` / `foodA` / `foodB` / `foodSoft` | `#0B7A57` / `#075C43` / `#0C7E5C` / mint 16% | `#3BE2A3` / `#075841` / `#0D7E5C` / mint 18% | Food's hue: the flat colour, the hero gradient's two ends and the glow |
| `chatSoft` | indigo 14% | indigo 18% | Chat's glow; its send button and tab icon are `indigo` |
| `onHero` / `onHeroSoft` / `heroTrack` | white / white 92% / white 22% | same | Type and ring tracks on a hero gradient; labels at 92% so the strip letters read on the light end |
| `error` / `warning` | `#D70015` / `#B25E00` | `#FF6961` / `#FFB340` | Destructive, caution |
| `background` / `surface` / `border` | `#F6F5FF` / `#F7F9FF` / `#D5DCEF` | `#1E1A44` / `#1C2142` / `#2E3460` | Solid fallbacks (Reduce Transparency, sheets) |

Muscle groups are small coloured dots next to a text label (`muscleGroupColors`), not filled chips. They're identity only, never met or unmet; `full_body` is slate `#7C8DB5` so done-orange stays unique.

Partial progress (bars toward a target) is ink (`text`); unmet is grey text ("1/2"), never orange or red.

During the rollout, the old names (`primary`, `secondary`, `success`, `accent`, `primaryLight`, `surfaceVariant`, `borderLight`) are aliases for the tokens above. Don't use them in new code.

## Typography

All system fonts; Dynamic Type and Bold Text work for free. SF Pro Rounded is `fonts.rounded` (`'ui-rounded'` on iOS).

| Role | Font | Paper variant |
|---|---|---|
| Hero number (56) | Rounded Black, tabular | `displaySmall` |
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
- **`SkySheet`**: one surface under a title: full width, 32 pt top corners, the card material. Every `SkyCard` inside it renders as a flat section with a hairline under it. Chat and Settings use it; Today, Training and Food stack cards instead (see Surfaces).
- **`HueCard`**, **`Ring`**, **`Disc`**, **`WeekStrip`**, **`Caps`**, **`CardHead`**, **`Link`**, **`CoachLine`**, **`Doors`** (`components/Hue.tsx`): the twins' shared pieces. `HueCard` is a tab's one bold card, a gradient from the hue's dark end (`trainA`, `foodA`) to its light end, white type. `WeekStrip` is seven Monday-first `Disc`s (34 pt) with the day letters above: white when done, dashed when planned, dim in the future, a ring of the day's share on Food, an outline around today; every disc opens its day. `Caps` is the 11 pt caps label that names every block ("THIS WEEK", "TODAY BY MEAL"); `CardHead` puts it on a block's first line with one `Link` ("Month ›", "All 17 ›") or a number on the right. `CoachLine` is one sentence written on the phone (`services/coachLine.ts`, no model call): the coach's indigo sparkle, a bold lead, the rest; on Training a tap opens the check-in's Wins, Watch and Next 7 days. `Doors` is "More": a row of 66 pt doors, icon in the tab's hue over an 11 pt label, each a screen that exists.
- **`MealTimeline`** (`components/MealTimeline.tsx`, layout in `services/week.ts` `mealBubbles` and `layoutMeals`; on the Meals screen): today by meal on a 6 am – 10 pm axis: one mint bubble per logged message, sized by its protein (18–30 pt radius), the grams inside, name and time beneath; meals within 45 minutes merge, six is the most; a dashed bubble for what's left to the goal where the next meal usually lands. Bubbles keep 72 pt apart so names never overlap.
- **`SkyCard`**: a content card (material over the sky, solid under Reduce Transparency); a flat section inside a `SkySheet`.
- **`SectionLabel`**: the small caps label above a section's card; inside a card only for a sub-part of it. **`SectionAction`** is the one text action on its line ("Edit", "Select").
- **`Pill`** (`components/Glass.tsx`): 50 pt pill button, `filled` (sunrise) for the main action and `glass` for the rest; `size="small"` for chips and inline actions.
- **`GlassSurface`**: Liquid Glass (`expo-glass-effect`) for controls, with a translucent fallback before iOS 26 and a solid one under Reduce Transparency.
- **`Composer`**: the Messages-style glass capsule with a send button. Dictation is the keyboard's mic key.
- **`ChatBar`**, **`ChatScreen`** (`components/ChatBar.tsx`): the one chat bar all four tabs share, pinned above the tab bar (keyboard and safe area handled by `ChatScreen`): suggestion chips (only when something is timely, see Consistency) over a `Composer`, whose send button is the tab's hue (`hue` on `ChatScreen`, which also paints the tab's glow). Your message shows as a `UserBubble` and the answer as a card in the page, which hides the rest of the page while it's open. Only the placeholder, chips and what a send does change per tab: Today logs a workout, food, or both from one message ("What'd you do or eat today?"), Training plans ("Plan your week, or “legs on Wed”", answered by a `PlanCard`) or adds a missed workout, Food logs what you ate ("What'd you eat?"), Chat logs or plans ("Log something or ask"). A question in any bar is answered on Chat (`services/ask.ts` `readsAsQuestion`); results are reviewed where you typed, then land in Chat's thread. Chips come from `services/suggestions.ts`. While a parsed card is open, the bar fixes it.
- **`Segmented`**, **`HeaderButton`**: a capsule option switch, and an SF Symbol button for the native header.
- **`Field`** (`components/Field.tsx`): a text field on a quiet fill with a small caps label.
- **`Row`** (`components/Row.tsx`): a settings-style row with a symbol tile, title, subtitle and accessory.
- **The twins.** Training and Food are the same four blocks in the same order, in two hues (Training coral, Food mint), so the colour alone says which tab you are on: **1 the goal and this week** (the `HueCard` hero: "THIS WEEK" and "Month ›" to the calendar, a 40 pt number with its unit, a two-line note on the right, the `WeekStrip`), **2 the breakdown**, **3 the trend with one `CoachLine`**, **4 "More"** (`Doors`). "This week" is the calendar week, Monday first (`services/week.ts`); goals, the sky and the check-in keep the rolling last 7 days. 3–4 blocks a tab, a scroll of about a screen at most.
- **Today** (`app/(tabs)/index.tsx`): "What now?". Title "Today", the date. Done today as two `HueCard`s side by side, Training coral and Food mint (the glow blends both from the corners and the send button is a coral-to-mint gradient): a 64 pt ring (full with a ✓ once trained; the share of the food goal), the workout's name or the goal's number large, one line of the rest; each only when it applies (someone who never logs food sees no Food card), the Training card full width alone. Then **Next up** (`services/week.ts` `nextUp`): "Start Legs" with a coral Start (and a quiet "Skip today") while today's plan isn't logged; else, for those who log food, the next meal: "Log dinner · 24 g to go" with a protein goal, "Log lunch" without, with what you usually log then (`usualMeals`) and a mint Log that puts it in the bar (the bar is left alone when there's no usual meal); else, for those who train, "Plan tomorrow" when nothing is planned; else what's done. Then **Tomorrow** (or the next planned day): a dashed day disc, "Legs · planned", exercises and the first lift's next number; opens the day, or plans one in Training when nothing is. Then one coach line (`todayLine`): what's left and the goal muscle furthest off that a planned day covers. The first-run hint, "Show me an example" and the "plan the rest of your week" prompt keep their conditions.
- **Training** (`app/(tabs)/training.tsx`): "How is training going?". Subtitle "Oct 19 – 25 · goal 4 days a week, each muscle 2×". Hero: "3 of 4 days", the next planned day on the right, the strip (white = trained, dashed = planned, outline = today). Breakdown: **the muscle grid** (`MuscleGrid` in `components/GoalsCard.tsx`): goal muscles down the side (the default nine without goals), the week across, a muscle-coloured 17 pt dot on each day it was trained as a main muscle, a dashed ring on a day it's planned, and a **sets** column (`formatSets`, "5½+" when some weren't written down), "12 ✓" in sunrise once the muscle's goal is met; above 130% text each name goes on its own line; a row opens the muscle. With no goals, the "Set a weekly goal" prompt sits under it (Each muscle 2× a week, My own goals, Not now; Not now is for good). Trend: **Lifts**, the three latest lifts with numbers (PR badge, "185 × 5 · up 15 lb in 5", a sparkline, "next 190x5" or "try" in warning when stuck 3+ sessions), your own lift and "N× a week" goals as rows, then the coach line (`trainingLine`: the gap muscle and whether a planned day closes it, else the check-in's headline); tapping the line opens the weekly check-in (`services/checkin.ts`, written on the phone, no AI): Wins (recent bests, weeks in a row, goals met), Watch (a muscle left 10+ days, a lift stuck with its next number, a food goal missed on most days) and Next 7 days. "All 17 ›" opens Exercises. Doors: Plan (templates), Exercises, Goals, Photos, Health. With nothing ever logged, a "Your training shows up here" card takes the grid's place. The bar plans your week ("Repeat this week", "Next week, 4 days"; plan words, "tomorrow" and "next" plan, a request from Today or a day plans whatever the words) or logs a missed day ("legs on Wed", "Log Wednesday · Legs"); a question goes to Chat.
- **Food** (`app/(tabs)/food.tsx`): "How is food going?". Subtitle "Oct 19 – 25 · goal 160 g protein a day" ("no food goal yet"). Hero: "152 g a day", "At goal 2 of 4 days" ("Food on 4 days" without a goal), the strip as rings of each day's share of the goal, closed when met. Breakdown: **Your goals** (`components/FoodGoalsCard.tsx`): up to four food goals, one row each in the same shape: a dot and the name, days at goal this week under it, the week as seven small cells (filled = met, half = partly, dim = missed or no food, lighter = future, a ring around today), and today's value against the goal on the right ("112 / 160 g", "1,450 / 2,200", "2 / 3 meals"). Goals are protein, calories (cut or bulk), low-GI meals and fiber (`FoodGoal`, `services/goals.ts` `foodGoalRows`, `services/week.ts` `goalWeek`); the fiber and low-GI rows show only once the food log carries those numbers. "Edit goals ›" and the Food goals door open the picker (`app/food-goals.tsx`: a switch and a number per goal, Cut or Bulk for calories; protein, else calories, is the main goal the hero, Today and the trend use). Trend: **Protein · 4 weeks** (`foodTrend`): "128 → 152 g", "a day · up 3 weeks running" (or "up from last week", "down from last week"), four bars for the four calendar weeks (this week in mint, the goal a dashed line), then the coach line (`foodLine`: weekends against weekdays, a meal that's always light, else the 4-week average against the goal; only with a protein goal and 3+ days of food). "Details ›" opens the Food details screen. Doors: Food goals (the picker), All meals (`app/meals.tsx`: **Today by meal**, `MealTimeline`, then the last days with food as `DayRow`s), Top sources (Food details), Body weight (Apple Health). Every food block is conditional: with no food and no goal, a "Your food shows up here" card. A Cut or Bulk goal shows calories in the same places (`foodValue`, `foodMet`). The bar logs what you ate ("What'd you eat?"; your usual meal for this time of day as a chip, examples until there's a log).
- **Calendar** (`app/calendar.tsx`, from "Month ›"): the record. Days logged in the last 7 and planned in the next 7 as the subtitle, the calendar (last week, this week and next week; **Show full month**; every day opens its day screen), then every day by month, one `DayRow` each (**Show earlier** for more).
- **Food details** (`app/food-week.tsx`, from "Details ›" and the Top sources door): `FoodBreakdown`, food over the last 7 days: the average, days at goal, a bar a day of the goal's number with its target as a dashed line (ink until met, sunrise on a day it was met), then calories, carbs · fat and where the protein came from (or protein and carbs · fat on a Cut or Bulk).
- **Apple Health** (`app/health.tsx`, from the Health and Body weight doors): `HealthCard` once it's on in Settings (body weight with its change, then a row per workout other apps saved: activity and minutes, day and source); otherwise what it would show and "Open Settings".
- **Progress photos** (`app/photos.tsx`, from the Photos door on Training): a locked card (Face ID or passcode; it re-locks on leaving the screen or the app, and a plain cover with a lock hides it while the app is inactive). Unlocked: an "Add a photo" card (Front / Side / Back as a `Segmented`, "Take photo" filled and "Choose from Photos" glass stacked at full width, a line that taken photos skip the camera roll), then one card per month with photos two a row at 375 pt (one a row above 130% text), date and pose under each, labels wrapping. Tap opens the photo with Compare with… and Delete photo; press and hold offers the same. Two photos show side by side (stacked at large text) with "In between, from your log": training days a week and up to 3 lifts' heaviest weights. No chat bar, share or export.
- **Chat** (`app/(tabs)/chat.tsx`): the log as one thread, kept on the phone (`stores/chatStore.ts`). Title "Chat", subtitle "Everything you've told LiftText", the gear (`HeaderButton`) opens Settings. Your messages are `UserBubble`s; the app's side are reply bubbles on the left (`components/ThreadCards.tsx`: "Logged · Push" with muscle dots and Open, "Planned · Legs, Thu", read live so a delete shows "Deleted") and `CoachCard` answers, with a bar chart of the last top sets when the question names one lift (drawn from the log, never from the model). A time stamp after a 30-minute gap. At the bottom, one opener written on the phone (`services/opener.ts`): today's plan with Start / Not today, a comeback line after 5+ days off (its chip "What should I start with?"), or a welcome line on an empty thread with "General training information, not medical advice."; never a blank chat. Otherwise chips are questions (`askChips`).
- **`GoalBar`** (`components/GoalBar.tsx`): the one food-goal mark: a bar toward the target, ink until met, sunrise once met, nothing on a day with no food. In day rows it's just the number with a sunrise ✓ when met (grey when not); on Food details, `DayBars` is one bar a day under a thin target line. With no food goal there's no bar; the number shows as plain text.
- **`DayRow`** (`components/DayRow.tsx`): one even row per day (about 64 pt) for the calendar's Days: the day and its workout's name, the muscles as dots, then the food line ("1,755 kcal · 3 meals"), with the food goal's number on the right (a ✓ once met). The whole row opens the day.
- **`UserBubble`** (`components/Chat.tsx`): your message on the right in indigo.
- **`ParsedCard`** (`components/ParsedCard.tsx`): the parsed workout reviewed before saving. It shows only what was said: detail is optional, so an exercise with no numbers shows an "Add details" link instead of empty chips. Numbers are tappable chips; values flagged `unsure` (genuine ambiguity the app spots in a first parse, `flagGuesses` in `services/draft.ts`, plus what a typed fix left uncertain; never missing detail) are outlined in warning; an unsure exercise name is a button that opens **`ExercisePicker`** with its best matches first (`likelyExercises` in `services/exerciseIdentity.ts`), and the pick is saved as an alias for the user's words with a "Remembered: rows = Barbell Row · Undo" line under the row; a low `confidence` shows a banner asking for a check; Save, Discard and, outside the chat tabs (where the chat bar does it), a **`FixBox`** for typed fixes and questions, with a **`FixReply`** for the answer (or "I didn't change anything") and the one-tap "Call it '…' from now on". The flow lives in `hooks/useLogDraft.ts` (Today, Training, Food, Chat and Add Workout); the workout screen reuses `FixBox` and `FixReply`.
- **`FoodCard`**, **`FoodRows`**, **`FoodDay`** (`components/`): food from the same composer. A message with food in it opens `FoodCard` (or, when it held a workout too, a "Food" part inside the one `ParsedCard`): one row per food with a category dot (`foodCategoryColors`), the name, an amount chip and a unit chip that switches units keeping the weight, and protein and calories on the right. Tap a row for carbs, fat, fiber and the source: USDA rows say which USDA food; the AI's best guesses for branded, restaurant and homemade food get an open ring for a dot and a "≈" on the calories, and their numbers are editable. `FoodDay` is the day screen's Food section: a goal header (the day's `GoalRing` and "88 g protein of 160 g"), carbs and fat as plain text, then the day's food grouped by meal. A meal is one logged message, named by the time it was logged ("Morning · 8:10 am", "Midday", "Afternoon", "Evening") with its protein on the right; each food is one read-only line, and tapping it opens its amount, unit, swap and × in place. Calories get a target only when the food goal is Cut or Bulk; never red, never a grade.
- **Food outside the composer** (one record: a day holds its training and its food): Today's Food card next to its Training card; the Food tab; the day screen has a "Training" section (the whole workout) and a "Food" section (by meal); the calendar puts a small grey dot under a date with food ("Ate" in the legend, "food logged" to VoiceOver) and its Days list is one `DayRow` per day; Goals has a Food section that opens the food goal picker. **Every food surface is conditional:** it shows only once that food data exists, so someone who never logs food sees no food UI.
- **Food goals**: up to four, one of each kind, in the picker (`app/food-goals.tsx`): Protein (at least this many grams a day), Calories (Cut: at or under; Bulk: at least), Low-GI meals (meals a day whose foods average a glycemic index of 55 or under) and Fiber (grams a day); checked on the days with food. Protein, else calories, is the main goal (`Goals.food`) that the hero, Today, the trend, the day screen and the check-in use; the rest are `Goals.foodGoals`. Whichever number the main goal doesn't measure still shows, as a plain number ("88 g protein" next to a calorie ring). Restaurant and homemade foods are estimates, so the Goals screen says to treat calories as a guide.
- **Exercises** (`app/exercises.tsx`, from Settings): every exercise A to Z, one row each with "Logged 12× · last 3 days ago · best 225 lb × 5". A row (and a lift on Training) opens its screen (`app/exercise.tsx`): next time, top sets, personal records, "Also logged as" (each wording you typed with its count and a Move to split those logs off, your own words for it with ×, and anything merged in with Undo), Rename (the name only) and Merge into… (a preview alert, "12 logs move to Bench Press · PRs recalculated", then a toast with Undo). The logic lives in `services/exerciseIdentity.ts`.
- **`ExerciseRows`** (`components/ExerciseRows.tsx`): read-only rows (muscle dot, name, numbers) with exercise notes and distance quiet underneath; used by the workout cards.
- **Headers**: pushed screens use the native stack header, transparent over the sky, with a minimal back button (`app/_layout.tsx`) and no title of its own: the screen's `LargeTitle` is its title.
- **Tab bar**: native tabs (`expo-router/unstable-native-tabs`) with SF Symbols, Today · Training · Food · Chat, tinted in the open tab's hue (Today ink, Training sunrise, Food mint, Chat indigo), minimising on scroll.
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

**Titles and subtitles.** Every tab has a large title and exactly one subtitle line, always present. The title is the tab's name. The subtitle is one live fact, about 48 characters at most so it fits one line at 375 pt (it may wrap at larger text, never truncate):

| Tab | Subtitle | With nothing to count |
|---|---|---|
| Today | Today's date, "Friday, October 23" | (always a date) |
| Training | The week and the goal, "Oct 19 – 25 · goal 4 days a week, each muscle 2×" | (always the week and the days-a-week goal) |
| Food | The week and the goal, "Oct 19 – 25 · goal 160 g protein a day" | "Oct 19 – 25 · no food goal yet" |
| Chat | "Everything you've told LiftText" | (always) |
| Calendar | Days logged (workout or food) in the last 7 and training days planned in the next 7, "Last 7: 2 logged · Next 7: 2 planned" | "Nothing logged in the last 7" |
| Settings | The weekly backup, "Backed up Oct 5" | "Not backed up yet" |

Pushed screens follow the same pattern: the thing as the title, one line of context.

**Space.** A tab is 3–4 blocks: the first screen holds the one summary that answers "how am I doing" plus the next thing to do, and the whole tab is at most about a screen of scroll; everything else is a door or a link away. Only the day screen, where you went for detail, gets cards taller than about 250 pt (the twins' heroes and the muscle grid are each a tab's one summary and may reach it). A list is one even row per day (about 64 pt). Controls (amounts, units) appear when you tap the thing, not on every row.

**Training, then Food.** Everywhere both show, in the same words and the same order: Training first, Food second, each section only when it has data. Muscles are coloured dots; food categories are coloured dots too, so the two read differently without a switch. There is no Training | Food toggle: a day is one record.

**Section labels** sit outside and above the card they label, with at most one action on the same line (`SectionAction` in `components/Sky.tsx`: `labelLarge` text in `textSecondary`, "Edit", "Select", never a pill): 8 pt above the card, 24 pt below the previous one. A label inside a card is only for a sub-part of it.

**Surfaces.** Today, Training and Food are the sky with the tab's glow, one `HueCard` hero, then plain cards (`SkyCard card`) with 12 pt between them, so the hue is the only loud thing on the screen; Chat and Settings are the sky, then one `SkySheet` of flat sections. Three surfaces, each with one job: a card (`SkyCard`) for a block of content; a tile (`dim` fill, 14 pt corners, clear edge, `mint` when met, `warning` when stale) for grid cells inside a card; a row (`Row`, hairline between rows) for lists inside a card. No card in a card, no glass on content, one idea per card.

**Numbers.** A number earns space only if it changes what you'd do next, and goes in a sentence first (Training's goal is its subtitle, not a tile). If a tile is ever needed: two to a row at most at 375 pt, one above 130% text, the value states its scale ("2 of 3"), and the label wraps.

**Empty states and prompts.** An empty state is a centered card: SF Symbol (30 pt, sunrise), a `titleMedium` line saying what will show up, one sentence on how, at most one action. A first-use prompt (like goals) is the same card left-aligned at the top of its screen: a filled one-tap setup, a glass "choose my own", and "Not now", which hides it for good. One at a time per screen.

**Chat suggestions** come from the user's own log and plan (`services/suggestions.ts`) and show only when something is timely; otherwise there's no chips row. Today: today's planned workout if it isn't logged ("Today's plan · Legs"), then the two most recent different workouts from the last 4 weeks ("Like Monday · chest, shoulders, biceps +1"); a tap fills the box with the exercises to edit. Training: "Repeat this week" and "Next week, N days" (these send), and planned days in the last week with nothing logged ("Log Wednesday · Legs"). New users (under 3 training days) get whole examples instead on Today and the usual plan starters on Training. Chips are whole phrases in the user's voice, never fragments; they hide while you type (fix chips on an open card stay); the row runs to the screen edge so a cut-off chip reads as "scroll for more". The placeholder says what the bar does on that tab.

**No text bleed.** Copy we write never truncates: labels, titles, buttons and chips wrap. `numberOfLines` only on text the user typed. A row's right-hand slot holds only small things (chevron, switch, short pill or value); a segmented control or button set goes on its own line under the row's title. If a label doesn't fit, drop a column, not letters. `maxFontSizeMultiplier` only inside fixed shapes (the calendar's day discs).

**Copy.** Plain English, American spelling, second person, sentence case everywhere including alerts. Alert titles say what happened or ask the question ("Couldn't delete the plan", "Skip today's workout?"), never "Error" or "Success". No exclamation marks, no grades, no nagging about missing detail. "This week" is the calendar week; "the last 7 days" is the rolling window. One name per thing: workout, training day, plan, goal; "session" is one exercise on one day.

## Accessibility

- Text on the sky and on cards meets 4.5:1 in both modes; check new colour pairs.
- Never rely on colour alone: logged is a filled circle, planned an outlined ring, today a ring around the date. Coral and mint are a red–green pair, so the tab's title, icon and caps labels name it too, and the twins' discs differ in shape (filled on Training, rings on Food).
- No text bleed: grids get fewer, larger cells instead of truncated labels. Check the smallest iPhone (375 pt) and the largest Dynamic Type size; above 130% a grid becomes a list.
- Respect Reduce Motion and Reduce Transparency (`useTheme().reduceTransparency`).
