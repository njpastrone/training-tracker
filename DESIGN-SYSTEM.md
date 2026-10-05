# LiftText Design System: Daylight

LiftText is iOS-26-native: content sits on a soft sky, Liquid Glass is used for controls, type is SF Pro Rounded + SF Pro, and you talk to the app through a Messages-style composer.

## Core Principles

1. **The sky is your last 7 days.** It starts at dawn and gets brighter with each workout logged. Your usual week's worth ends in full daylight; falling behind your usual pace turns it dusky. Dark Mode is always night.
2. **Glass for controls, material for content.** Liquid Glass only on the tab bar, composer and floating buttons, never on content (HIG Materials). Content cards are a translucent material over the sky.
3. **System first.** System fonts, SF Symbols, native tabs and sheets. Appearance follows the iPhone; there is no in-app theme setting.
4. **Fluid and physical.** Morph, don't cut. Springs, not linear tweens. Reduce Motion gets crossfades; Reduce Transparency gets solid surfaces.

## The Sky

`services/sky.ts` maps the last 7 days (a rolling window ending today, see `services/pace.ts`) to a sky. It is pure and unit-tested (`services/sky.test.mts`).

- **Target:** distinct planned days in the last 7 days from the schedule. With no plan, the usual weekly count: distinct training days in the 4 weeks before the last 7 days, divided by 4 and rounded (1–7; 3 with no recent history).
- **Done:** distinct days with a logged workout in the last 7 days.
- **Phase:**
  - `day` when done ≥ target;
  - `dusk` when behind pace: with a plan, fewer done than planned days already gone by; without one, fewer than the usual weekly count expects for the days counted so far (today counts once trained, days before your first workout never count);
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
- **`LargeTitle`**: the screen's large rounded title and an optional subtitle, as the first item in the scroll view.
- **`SkyCard`**: a content card (material over the sky, solid under Reduce Transparency).
- **`SectionLabel`**: the small caps label above a section or inside a card.
- **`Pill`** (`components/Glass.tsx`): 50 pt pill button, `filled` (sunrise) for the main action and `glass` for the rest; `size="small"` for chips and inline actions.
- **`GlassSurface`**: Liquid Glass (`expo-glass-effect`) for controls, with a translucent fallback before iOS 26 and a solid one under Reduce Transparency.
- **`Composer`**: the Messages-style glass capsule with a send button. Dictation is the keyboard's mic key.
- **`Segmented`**, **`HeaderButton`**: a capsule option switch, and an SF Symbol button for the native header.
- **`Field`** (`components/Field.tsx`): a text field on a quiet fill with a small caps label.
- **`Row`** (`components/Row.tsx`): a settings-style row with a symbol tile, title, subtitle and accessory.
- **`Ring`** (`components/Ring.tsx`): progress ring or open gauge (`react-native-svg`), sunrise gradient by default.
- **`UserBubble`**, **`CoachBubble`** (`components/Chat.tsx`): your message on the right in sunrise; the coach's on the left on glass with a LiftText-mark avatar.
- **`ParsedCard`** (`components/ParsedCard.tsx`): the parsed workout reviewed before saving. It shows only what was said: detail is optional, so an exercise with no numbers shows an "Add details" link instead of empty chips. Numbers are tappable chips; values flagged `unsure` (genuine ambiguity the app spots in a first parse, `flagGuesses` in `services/draft.ts`, plus what a typed fix left uncertain; never missing detail) are outlined in warning; a low `confidence` shows a banner asking for a check; Save, Discard and a **`FixBox`** for typed fixes and questions, with a **`FixReply`** under it for the answer (or "I didn't change anything") and the one-tap "Call it '…' from now on". The flow lives in `hooks/useLogDraft.ts` (Log and Add Workout); the workout screen reuses `FixBox` and `FixReply`.
- **`ExerciseRows`** (`components/ExerciseRows.tsx`): read-only rows (muscle dot, name, numbers) with exercise notes and distance quiet underneath; used by the workout cards.
- **Sheets**: Plan is a native form sheet (`presentation: 'formSheet'` in `app/_layout.tsx`) with a grabber and a close button.
- **Headers**: pushed screens use the native stack header, transparent over the sky, with a minimal back button (`app/_layout.tsx`).
- **Tab bar**: native tabs (`expo-router/unstable-native-tabs`) with SF Symbols, tinted sunrise, minimising on scroll.
- **Icons**: SF Symbols (`expo-symbols`) for UI icons. AI features (coach, parsing) use the LiftText mark (`components/LogoMark.tsx`; the Coach tab uses `assets/tab-logo.png`). No emoji as icons.
- **Haptics**: `expo-haptics`, success on logging and planning, selection on toggles.

## Motion

- The compose capsule morphs into your message bubble; the parsed card blooms up from it (spring ≈420 ms, damping ≈0.85, Reanimated).
- A warm edge light and a shimmer only while parsing. It is the only looping motion.
- Reduce Motion: crossfades, no glow.

## App Icon and Splash

- Icon ("Sent bubble"): a sunrise speech bubble with the barbell cut out in white, over a dawn sky, with dark (night sky) and tinted variants (`ios.icon` in `app.json`). Sources are in `assets/source/*.svg` (the bubble and barbell layers for Icon Composer in `assets/source/layers/`); render with `rsvg-convert -w 1024 -h 1024`. The AI mark (`components/LogoMark.tsx`, `assets/tab-logo*.png` at 26/52/78 px) is the same bubble as one path, `assets/source/logo-glyph.svg`.
- Splash: the bubble mark on `#FADCE6`, and on night `#141938` in Dark Mode.

## Accessibility

- Text on the sky and on cards meets 4.5:1 in both modes; check new colour pairs.
- Never rely on colour alone: logged is a filled circle, planned an outlined ring, today a ring around the date.
- Respect Reduce Motion and Reduce Transparency (`useTheme().reduceTransparency`).
