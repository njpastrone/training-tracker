# Daylight Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LiftText look less generic without changing what it does: a stronger sky, one sheet per tab, a sun arc instead of rings, colour with one job each, big numbers, and the small details fixed.

**Architecture:** Visual changes only, in the existing components. Two new pure helpers get unit tests (`services/sunArc.ts`, the sky contrast check); everything else is checked in the simulator. A `SheetContext` lets every existing `SkyCard` inside a tab's new `SkySheet` render as a flat, hairline-separated section, so screens don't need rewriting card by card.

**Tech Stack:** Expo 57 / React Native 0.86, TypeScript strict, React Native Paper, `react-native-svg`, `expo-linear-gradient`, Reanimated. Tests: `node --test` via `npm test`.

**Spec:** `docs/superpowers/specs/2026-10-15-daylight-polish-design.md` (colours: palette G, which wins over the refined mockups where they differ) (mockups: "Daylight, refined" row on https://claude.ai/artifact/ML7Z1yCk1yGeQqAAHp2HNL).

## Global Constraints

- Visual only: no new features, data, storage or navigation changes.
- `sunrise` = the one action on a screen, or done (trained day, goal met ✓, the sun). Never links, labels, partial progress or unmet.
- Partial progress and planned are ink (`colors.text`); links and section actions are `colors.textSecondary`.
- Unmet is grey text ("1/2"), never orange or red.
- `cobalt` no longer means planned; `mint` only for the save/undo toasts' checkmark; `indigo` means you (your bubbles, the selected tab), never actions or done.
- Copy rules from DESIGN-SYSTEM.md hold: "the last 7" is the rolling window, never "this week"; sentence case; no exclamation marks; nothing truncates.
- Respect Reduce Motion (no spring) and Reduce Transparency (solid surfaces: `colors.surface` / `colors.border`).
- Every UI change is checked on a 375 pt iPhone at default and the largest Accessibility text size, light and dark.

## Review Focus

- **Done exceeds target** (e.g. 4 days trained against a target of 3): the sun arc must clamp at the end of the arc, and the count still reads "4 of 3"; pinned by a `sunArc` test in Task 3.
- **Zero done** (new week, nothing logged): no sun, no filled arc, only hollow target dots; pinned by a `sunArc` test in Task 3.
- **Target of 1 or 7**: dots must not collide or fall off the arc; pinned by `sunArc` tests in Task 3.
- **Dawn and dusk skies**: title text must stay readable on the new saturated top stops; pinned by the contrast test in Task 1.
- **No food logged that day / food goal Off**: `GoalBar` renders nothing and rows show no number; checked in Task 2's simulator step (day screen for a no-food day and a goal-Off state).

## File map

- Modify `services/sky.ts` (stops), `services/sky.test.mts` (contrast test), `components/Sky.tsx` (gradient locations, glow, `SkySheet`, `SheetContext`, `Hero`).
- Create `components/GoalBar.tsx`; delete `components/GoalRing.tsx`, `components/Ring.tsx`.
- Modify `components/DayRow.tsx`, `components/FoodDay.tsx`, `components/GoalsCard.tsx`, `components/Calendar.tsx`, `components/PlanCard.tsx`, `components/TodayTiles.tsx`, `components/Glass.tsx`, `components/ChatBar.tsx`, `constants/theme.ts`.
- Create `services/sunArc.ts`, `services/sunArc.test.mts`, `components/SunArc.tsx`.
- Modify screens: `app/(tabs)/index.tsx`, `history.tsx`, `progress.tsx`, `settings.tsx`.
- Modify `DESIGN-SYSTEM.md`.

## Running the app for visual checks

Port 8081 on this Mac is taken by another local server, and Expo bundles `.env.eval.local` by mistake, so:

```bash
mv .env.eval.local .env.eval.local.paused   # only if it's there; rename back when done
npx expo start --go --port 8082
xcrun simctl openurl booted exp://$(ipconfig getifaddr en0):8082
```

The simulator already has five weeks of demo data restored (scratchpad `LiftText-demo.json`). Switch appearance with `xcrun simctl ui booted appearance dark|light`.

---

### Task 1: Stronger sky (palette G)

**Files:**
- Modify: `services/sky.ts:8-15`
- Modify: `components/Sky.tsx:11-31`
- Test: `services/sky.test.mts`

**Interfaces:**
- Produces: `SkyStops` is now four stops `[top, middle, low, base]`; `SKY` keeps its keys. The base (`stops[3]`) is what fills below the gradient and what Task 5's fade uses.

- [ ] **Step 1: Write the failing test** (append to `services/sky.test.mts`)

```ts
// WCAG relative luminance and contrast, for text on the sky
const lum = (hex: string) => {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every sky has four stops and keeps the title and subtitle readable', () => {
  for (const phase of ['dawn', 'day', 'dusk'] as const) {
    assert.equal(SKY[phase].length, 4, phase);
    for (const stop of SKY[phase]) assert.ok(contrast('#0E1430', stop) >= 4.5, `title on ${phase} ${stop}`);
    assert.ok(contrast('#4A5374', SKY[phase][1]) >= 4.5, `subtitle on ${phase}`);
  }
  assert.equal(SKY.night.length, 4);
  for (const stop of SKY.night) assert.ok(contrast('#F3F5FF', stop) >= 4.5, `night ${stop}`);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test 2>&1 | grep -B2 -A6 "four stops"`
Expected: FAIL (`SKY.day.length` is 3).

- [ ] **Step 3: Palette G** in `services/sky.ts`

```ts
export type SkyStops = [string, string, string, string]; // top, middle, low, base

// Palette G (twilight skies with a lavender cast): saturated at the top, the base by about 45% of the screen
export const SKY = {
  dawn: ['#FFB4A0', '#F9CFE0', '#E8E0FA', '#F8F6FF'] as SkyStops,
  day: ['#8AA8FF', '#BCC9FF', '#E0E3FF', '#F6F5FF'] as SkyStops,
  dusk: ['#FF9F7E', '#E7A6CF', '#C9BDF2', '#F3F1FF'] as SkyStops,
  night: ['#0D0B2A', '#1A1640', '#2A1F52', '#1E1A44'] as SkyStops,
};
```

`mixStops` already maps over every stop, so dawn still blends toward day.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass. If the subtitle check fails on a phase, report it rather than changing the palette: the spec's numbers say it passes.

- [ ] **Step 5: Gradient shape and glow** in `components/Sky.tsx` `SkyScreen`: `backgroundColor: stops[3]`, `locations={[0, 0.15, 0.3, 0.45]}`, and a glow in every phase, warm by day (replace the `{isDarkMode && (...)}` block):

```tsx
<LinearGradient
  colors={isDarkMode ? ['rgba(42,39,102,0.9)', 'rgba(42,39,102,0)'] : ['rgba(255,248,232,0.75)', 'rgba(255,248,232,0)']}
  start={{ x: 0.85, y: 0 }}
  end={{ x: 0.35, y: 0.45 }}
  style={StyleSheet.absoluteFill}
/>
```

`// ponytail: one 45% fade for every screen; the spec's 30% for short headers can come later if History or Settings look washed out.`

- [ ] **Step 6: Typecheck and simulator** — `npx tsc --noEmit` (fix any other `SkyStops`/`SKY.*[2]` users it flags by switching them to `[3]`), then check all four tabs in light and dark. For dusk, set Settings › Days a week › 5+ (behind pace); set it back after.

- [ ] **Step 7: Commit**

```bash
git add services/sky.ts services/sky.test.mts components/Sky.tsx
git commit -m "feat(sky): palette G, four-stop twilight skies"
```

---

### Task 2: Colour jobs and GoalBar

**Files:**
- Create: `components/GoalBar.tsx`
- Delete: `components/GoalRing.tsx`
- Modify: `components/GoalsCard.tsx` (Bar, WeekGrid food row and counts, GoalsHeader link, PR is in progress.tsx), `components/DayRow.tsx:40-60`, `components/FoodDay.tsx:47-60`, `components/Calendar.tsx:23,123-148`, `components/PlanCard.tsx:88`, `components/TodayTiles.tsx` (UpNext dot, RecentDays link), `app/(tabs)/progress.tsx:291`, `app/(tabs)/history.tsx` (Select link colour)

**Interfaces:**
- Produces: tokens `indigo`, `onIndigo`; `GoalBar({ goal: FoodGoal; day?: { protein: number; kcal: number } }): JSX.Element | null` (default export); `Bar({ progress, done })` keeps its signature but is ink when partial, sunrise when done. `DayBars({ goal, days }: { goal: FoodGoal; days: { date: string; total?: { protein: number; kcal: number } }[] })` exported from `components/GoalsCard.tsx`.

- [ ] **Step 0: Palette G tokens** in `constants/theme.ts`:
  - add `indigo: '#5534C8'`, `onIndigo: '#FFFFFF'` (light) and `indigo: '#A995FF'`, `onIndigo: '#0A1030'` (dark);
  - light `textTertiary` `#6E7798` → `#5F6889`;
  - `background` light `#F6F5FF`, dark `#1E1A44`;
  - `muscleGroupColors.full_body` `#D2441C` → `#7C8DB5`.
  Then: `UserBubble` (`components/Chat.tsx`) uses `colors.indigo` / `colors.onIndigo`; the tab bar (`app/(tabs)/_layout.tsx`) `tintColor={colors.indigo}`.

- [ ] **Step 1: `Bar` colours** (`components/GoalsCard.tsx`, `Bar`): `backgroundColor: done ? colors.sunrise : colors.text`, and update its comment to `// A progress bar: ink toward the target, sunrise once met; never shorter than a stub`.

- [ ] **Step 2: Create `components/GoalBar.tsx`**

```tsx
import { foodMet, foodValue } from '../services/goals';
import type { FoodGoal } from '../types/workout';
import { Bar } from './GoalsCard';

// The food goal's one mark: a bar toward the target, ink until met, sunrise once met.
// Nothing on a day with no food. Never red, never a grade.
export default function GoalBar({ goal, day }: { goal: FoodGoal; day?: { protein: number; kcal: number } }) {
  if (!day) return null;
  return <Bar progress={foodValue(goal, day) / goal.target} done={foodMet(goal, day)} />;
}
```

- [ ] **Step 3: `DayRow`** — drop the ring; the number carries a ✓ when met and goes grey when not. Replace the right-hand block with:

```tsx
{food && (
  <Text style={[styles.value, { color: goal && !foodMet(goal, food) ? colors.textSecondary : colors.text }]}>
    {value}
    {goal && foodMet(goal, food) ? <Text style={{ color: colors.sunrise }}>{' ✓'}</Text> : null}
  </Text>
)}
```

Import `foodMet` from `../services/goals`; remove the `GoalRing` import and the now-unused `right` style.

- [ ] **Step 4: `FoodDay` header** — replace `<GoalRing goal={goal} day={t} size={48} />` and its row with a column: the number line first, then `<GoalBar goal={goal} day={t} />` under it (style the wrapper `{ gap: 8 }`); import `GoalBar` instead of `GoalRing`.

- [ ] **Step 5: Progress grid food row** — in `WeekGrid` replace the per-day `GoalRing` cells with one `DayBars` row and delete the "Rings fill toward…" legend and `ringRule`. Add to `components/GoalsCard.tsx`:

```tsx
// The food goal across the last 7 days: one bar a day toward the target (the dashed line), sunrise when met
export function DayBars({ goal, days }: { goal: FoodGoal; days: { date: string; total?: { protein: number; kcal: number } }[] }) {
  const { colors } = useTheme();
  const top = Math.max(goal.target, ...days.map(d => (d.total ? foodValue(goal, d.total) : 0))) * 1.1;
  return (
    <View style={styles.dayBars}>
      <View style={[styles.targetLine, { bottom: `${(goal.target / top) * 100}%`, borderColor: colors.textTertiary }]} />
      {days.map(d => (
        <View key={d.date} style={styles.cell}>
          {d.total ? (
            <View style={[styles.dayBar, { height: `${Math.max(6, (foodValue(goal, d.total) / top) * 100)}%`, backgroundColor: foodMet(goal, d.total) ? colors.sunrise : colors.dim }]} />
          ) : (
            <View style={[styles.restDot, { backgroundColor: colors.dim }]} />
          )}
        </View>
      ))}
    </View>
  );
}
```

with styles `dayBars: { flexDirection: 'row', alignItems: 'flex-end', height: 44, flex: 1 }`, `targetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' }`, `dayBar: { width: 14, borderRadius: 4 }`. Use it in place of the `days.map(...)` inside the food row's `gridRow`. Import `foodMet`, `foodValue` from `../services/goals`.

- [ ] **Step 6: Met counts** in `WeekGrid`: `color: met ? colors.sunrise : colors.textSecondary` (was mint).

- [ ] **Step 7: Delete `components/GoalRing.tsx`** and confirm nothing imports it:

Run: `grep -rn "GoalRing" app components hooks` → Expected: no output (TodayTiles still imports it until Task 3; if so, leave the file and delete it at the end of Task 3 instead).

- [ ] **Step 8: Planned is ink, links are quiet**
  - `Calendar.tsx`: planned day `{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.text }`, its text `colors.text`; legend swatch the same; update the line-23 comment to "planned = an ink dashed ring".
  - `TodayTiles.tsx` `UpNext`: `ringDot` uses `borderColor: colors.text, borderStyle: 'dashed'`; `RecentDays` "All days" link `color: colors.textSecondary`, label text `All days ›`.
  - `PlanCard.tsx:88`: `on ? { backgroundColor: colors.text }`.
  - `GoalsHeader` "Edit": `colors.textSecondary`. History's "Select" pill and Progress's other section actions: same.
  - `progress.tsx:291` PR badge: `colors.sunrise` and `colors.sunrise + '1F'`.

- [ ] **Step 9: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no errors, all tests pass.

- [ ] **Step 10: Check in the simulator** — History calendar (dashed ink planned, orange trained), Log Recent and History Days rows ("160 g ✓", grey "116 g"), Progress grid (food bars, dashed target, no caption), a day screen with food, a day with no food (no bar), and Goals › Food › Off (rows show no goal number mark).

- [ ] **Step 11: Commit**

```bash
git add -A components app
git commit -m "feat(ui): one job per colour, food goal as a bar"
```

---

### Task 3: The sun arc

**Files:**
- Create: `services/sunArc.ts`, `services/sunArc.test.mts`, `components/SunArc.tsx`
- Modify: `components/TodayTiles.tsx` (default export), `app/(tabs)/index.tsx:150-175`, `constants/theme.ts` (`displaySmall`, `rounded` weight type)
- Delete: `components/Ring.tsx` (and `components/GoalRing.tsx` if Task 2 left it)

**Interfaces:**
- Consumes: `useTheme().sky` (`{ done, target }`), `fonts`, colours.
- Produces: `sunArc(done: number, target: number, w: number, h: number): { r: number; cx: number; cy: number; dots: { x: number; y: number; done: boolean }[]; sun?: { x: number; y: number }; doneAngle: number }`; `SunArc()` (no props; reads `useTheme().sky`); `TodaySummary(props)` replaces `TodayTiles` default export with the same props.

- [ ] **Step 1: Write the failing tests** — `services/sunArc.test.mts`

```ts
/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunArc } from './sunArc';

const W = 350, H = 170;

test('one dot per target day along the arc, the last on the horizon', () => {
  const a = sunArc(0, 3, W, H);
  assert.equal(a.dots.length, 3);
  const last = a.dots[2];
  assert.ok(Math.abs(last.x - (a.cx + a.r)) < 0.01 && Math.abs(last.y - a.cy) < 0.01);
  assert.ok(a.dots.every(d => !d.done));
});

test('no sun when nothing is done', () => {
  assert.equal(sunArc(0, 3, W, H).sun, undefined);
  assert.equal(sunArc(0, 3, W, H).doneAngle, Math.PI);
});

test('the sun sits on the latest done dot', () => {
  const a = sunArc(2, 3, W, H);
  assert.deepEqual(a.sun, { x: a.dots[1].x, y: a.dots[1].y });
  assert.deepEqual(a.dots.map(d => d.done), [true, true, false]);
});

test('more done than the target clamps at the end of the arc', () => {
  const a = sunArc(4, 3, W, H);
  assert.equal(a.dots.length, 3);
  assert.ok(a.dots.every(d => d.done));
  assert.deepEqual(a.sun, { x: a.dots[2].x, y: a.dots[2].y });
  assert.equal(a.doneAngle, 0);
});

test('targets of 1 and 7 stay on the arc and apart', () => {
  assert.equal(sunArc(1, 1, W, H).dots.length, 1);
  const seven = sunArc(3, 7, W, H).dots;
  for (const d of seven) assert.ok(d.x >= 0 && d.x <= W && d.y >= 0 && d.y <= H);
  for (let i = 1; i < seven.length; i++) assert.ok(Math.hypot(seven[i].x - seven[i - 1].x, seven[i].y - seven[i - 1].y) > 20);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test services/sunArc.test.mts`
Expected: FAIL, cannot find module `./sunArc`.

- [ ] **Step 3: Implement** `services/sunArc.ts`

```ts
// Geometry for the sun arc (components/SunArc.tsx): a half circle over the horizon, one dot per
// target day, the sun on the latest done day. Angles run from π (left horizon) to 0 (right horizon).
// The first dot is one step in from the left, so a target of 1 puts its only dot on the right horizon.
export function sunArc(done: number, target: number, w: number, h: number) {
  const r = Math.min(w / 2, h) - 12; // room for the sun's halo
  const cx = w / 2;
  const cy = h - 2;
  const at = (i: number) => {
    const angle = Math.PI * (1 - (i + 1) / target);
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const shown = Math.min(done, target);
  const dots = Array.from({ length: target }, (_, i) => ({ ...at(i), done: i < shown }));
  const sun = shown > 0 ? { x: dots[shown - 1].x, y: dots[shown - 1].y } : undefined;
  return { r, cx, cy, dots, sun, doneAngle: Math.PI * (1 - shown / target) };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test` (the `services/*.test.mts` glob already picks up the new file)
Expected: all pass. Fix floating comparisons only by tolerance, never by changing expectations.

- [ ] **Step 5: Hero type** in `constants/theme.ts`: widen `rounded`'s weight param to `'600' | '700' | '800' | '900'` and set `displaySmall: rounded(56, 60, '900')` (it is unused anywhere today; `grep -rn displaySmall app components` confirms).

- [ ] **Step 6: Create `components/SunArc.tsx`**

```tsx
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { sunArc } from '../services/sunArc';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const H = 170;

// Log's hero: training days in the last 7 as a sun rising over the horizon. One dot per target day,
// filled once done; the sun on the latest. Replaces the training ring.
export default function SunArc() {
  const { colors, sky, isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const W = width - spacing.screen * 2;
  const a = sunArc(sky.done, sky.target, W, H);
  const arc = (to: number) => `M ${a.cx - a.r} ${a.cy} A ${a.r} ${a.r} 0 0 1 ${a.cx + a.r * Math.cos(to)} ${a.cy - a.r * Math.sin(to)}`;
  const rise = useSharedValue(reduceMotion ? 0 : 24);
  useEffect(() => { rise.value = reduceMotion ? 0 : withSpring(0, { damping: 14 }); }, [sky.done, reduceMotion]);
  const sunProps = useAnimatedProps(() => ({ cy: (a.sun?.y ?? 0) + rise.value }));
  const line = isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.95)';
  return (
    <View style={{ height: H, marginBottom: spacing.md }} accessible accessibilityLabel={`${sky.done} of ${sky.target} training days in the last 7`}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={arc(0)} fill="none" stroke={line} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
        {sky.done > 0 && <Path d={arc(a.doneAngle)} fill="none" stroke={colors.sunrise} strokeWidth={3.5} strokeLinecap="round" />}
        <Line x1={0} y1={a.cy} x2={W} y2={a.cy} stroke={colors.textTertiary} strokeOpacity={0.4} strokeWidth={1.5} />
        {a.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={5} fill={d.done ? colors.sunrise : colors.background} stroke={d.done ? colors.sunrise : line} strokeWidth={2} />
        ))}
        {a.sun && <AnimatedCircle cx={a.sun.x} r={34} fill={colors.sunriseSoft} fillOpacity={0.3} animatedProps={sunProps} />}
        {a.sun && <AnimatedCircle cx={a.sun.x} r={15} fill={colors.sunrise} animatedProps={sunProps} />}
      </Svg>
      <View style={styles.centre}>
        <Text variant="displaySmall" style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
          {sky.done}
          <Text variant="displaySmall" style={{ color: colors.textTertiary }}>{` of ${sky.target}`}</Text>
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '600' }}>training days in the last 7</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
});
```

- [ ] **Step 7: `TodaySummary` replaces the tiles** in `components/TodayTiles.tsx`: rename the default export to `TodaySummary` (same props) and render, instead of two tiles, two plain blocks stacked (they will sit inside the Task 4 sheet):
  - Training block (when `training`): `trainingLine(...)` title in `headlineMedium` (28 pt), sub in `bodyMedium` secondary. Pressable to Progress as today.
  - Food block (when `food`): the centre value (`130 g`, or kcal) at `rounded 34/900` tabular, then ` of 160 g protein` in `bodyMedium` secondary on the same baseline; `<GoalBar goal={goal} day={day} />`; then the existing `sub` line. Goal Off: today's protein number large, no bar. Pressable to the day as today.
  - Delete `TrainingTile`, `FoodTile`, `Tile`, `RingLabel` and their styles; remove the `Ring`/`GoalRing` imports.

- [ ] **Step 8: Log screen** (`app/(tabs)/index.tsx`): import `SunArc` and `TodaySummary`; directly after `<LargeTitle …/>` render `{!reviewing && lifts && <SunArc />}`; replace `<TodayTiles …/>` with `<TodaySummary …/>` (same props).

- [ ] **Step 9: Delete `components/Ring.tsx`** (and `GoalRing.tsx` if still present). Run: `grep -rn "Ring'" app components` → Expected: only `GoalBar`/none.

- [ ] **Step 10: Typecheck, test, simulator**

Run: `npx tsc --noEmit && npm test`
Then on Log: the arc with 2 filled dots and the sun, "2 of 2"/"2 of 3"; with Reduce Motion on (Settings › Accessibility › Motion in the simulator) no spring; dark mode arc readable.

- [ ] **Step 11: Commit**

```bash
git add -A services/sunArc.ts services/sunArc.test.mts components app constants
git commit -m "feat(log): sun arc for training days in the last 7"
```

---

### Task 4: One sheet per tab, and the Progress hero

**Files:**
- Modify: `components/Sky.tsx` (add `SheetContext`, `SkySheet`, `Hero`; `SkyCard` reads the context)
- Modify: `components/ChatBar.tsx:93-101` (`contentContainerStyle` grows)
- Modify: `app/(tabs)/index.tsx`, `history.tsx`, `progress.tsx`, `settings.tsx`

**Interfaces:**
- Produces: `SkySheet({ children })`, `Hero({ value, of, note, sub }: { value: string; of?: string; note?: string; sub: string })`, both from `components/Sky.tsx`. Inside a `SkySheet`, `SkyCard` renders as a flat section (no fill, no radius, hairline on top except the first).

- [ ] **Step 1: Add to `components/Sky.tsx`**

```tsx
import { createContext, useContext } from 'react';

const SheetContext = createContext(false);

// A tab's one surface under the hero: full width, 32 pt top corners, the card material. Cards inside it
// render as flat sections split by hairlines (SkyCard reads SheetContext), so a tab never stacks cards.
export function SkySheet({ children }: { children: React.ReactNode }) {
  const { colors, reduceTransparency } = useTheme();
  return (
    <View
      style={[
        styles.sheet,
        reduceTransparency ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.card, borderColor: colors.cardLine },
      ]}
    >
      <SheetContext.Provider value={true}>{children}</SheetContext.Provider>
    </View>
  );
}

// A screen's one big number: "2 of 3", an optional sunrise note ("goal met ✓"), and what it counts
export function Hero({ value, of, note, sub }: { value: string; of?: string; note?: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hero} accessible accessibilityLabel={[value, of, note, sub].filter(Boolean).join(' ')}>
      <View style={styles.heroLine}>
        <Text variant="displaySmall" style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
          {value}
          {of ? <Text variant="displaySmall" style={{ color: colors.textTertiary }}>{` ${of}`}</Text> : null}
        </Text>
        {note ? <Text variant="titleMedium" style={{ color: colors.sunrise }}>{note}</Text> : null}
      </View>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{sub}</Text>
    </View>
  );
}
```

In `SkyCard`, `const inSheet = useContext(SheetContext);` and when true return `<View {...props} style={[styles.section, { borderTopColor: colors.dim }, style]} />` (styles: `section: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth }`). Add styles `sheet: { marginHorizontal: -spacing.screen, paddingHorizontal: spacing.screen, paddingTop: spacing.sm, flexGrow: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: StyleSheet.hairlineWidth * 2 }`, `hero: { marginBottom: spacing.lg, gap: 2 }`, `heroLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm }`.

- [ ] **Step 2: Let the sheet reach the bottom** — in `ChatScreen` (`components/ChatBar.tsx`) set `contentContainerStyle={[styles.content, styles.grow]}` with `grow: { flexGrow: 1 }`, and change `content`'s `paddingBottom` to `0` (the sheet's own padding ends the page). In `settings.tsx` do the same on its `ScrollView`.

- [ ] **Step 3: Wrap each tab** — everything after the title/hero goes in one `<SkySheet>`:
  - Log: after `<SunArc />` (when shown) wrap the rest of the children through `RecentDays`.
  - History: after `<LargeTitle …/>`.
  - Settings: after `<LargeTitle …/>`; section labels stay, cards become flat sections.
  - Progress: when the user has workouts, render `<LargeTitle title="Progress" />` (no subtitle) then `<Hero value={`${sky.done}`} of={`of ${sky.target}`} note={sky.done >= sky.target ? 'goal met ✓' : undefined} sub="training days in the last 7" />`; food-only and empty users keep `LargeTitle` with today's `subtitle` and no hero. Then `<SkySheet>` around the rest.

- [ ] **Step 4: Typecheck and simulator** — Run `npx tsc --noEmit`. Check every tab: one sheet from below the hero to the bottom, no card-in-card, empty states still centred (check on the iPhone 16e simulator, where Expo Go has no data: don't restore the demo backup there), Reduce Transparency (simulator Settings › Accessibility › Display › Reduce Transparency) shows a solid sheet, largest text size scrolls without clipping.

- [ ] **Step 5: Commit**

```bash
git add components/Sky.tsx components/ChatBar.tsx app
git commit -m "feat(ui): one sheet per tab, Progress hero number"
```

---

### Task 5: Details — fade, send button, sets rows

**Files:**
- Modify: `components/ChatBar.tsx` (`ChatScreen` fade), `components/Glass.tsx:154-166` (send), `components/GoalsCard.tsx` (`MuscleSetsCard`)

**Interfaces:**
- Consumes: `SKY` and four-stop `sky.stops` (Task 1), `Bar` (Task 2).

- [ ] **Step 1: Fade above the chat bar** — in `ChatScreen`, after `{overlay}` inside the same `View`:

```tsx
<LinearGradient
  pointerEvents="none"
  colors={[`${base}00`, base]}
  style={styles.fade}
/>
```

with `const { isDarkMode, sky } = useTheme(); const base = isDarkMode ? SKY.night[3] : sky.stops[3];` and `fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 }`. Imports: `LinearGradient` from `expo-linear-gradient`, `SKY` from `../services/sky`.

- [ ] **Step 2: Quiet disabled send** (`components/Glass.tsx`):

```tsx
style={[styles.send, { backgroundColor: canSend || busy ? colors.sunrise : colors.dim }]}
…
<SymbolView name="arrow.up" size={18} weight="bold" tintColor={canSend ? colors.onSunrise : colors.textTertiary} />
```

- [ ] **Step 3: Sets as rows** — rewrite `MuscleSetsCard`'s body: drop `perRow`/`rows`/tiles; render one `Pressable` row per muscle (same `onPress`, `accessibilityLabel`):

```tsx
<View style={[styles.setRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dim }]}>
  <View style={[styles.dot, { backgroundColor: muscleGroupColors[m.group] }]} />
  <Text style={[styles.setName, { color: colors.text }]}>{name}</Text>
  <View style={styles.fill}><Bar progress={m.sets / m.setsGoal!} done={met} /></View>
  <Text style={[styles.countText, { color: met ? colors.sunrise : colors.text }]}>{met ? `${formatSets(m.sets, m.setsMissing)} ✓` : `${formatSets(m.sets, m.setsMissing)} / ${m.setsGoal}`}</Text>
</View>
```

Under the name, keep `last` (`trainedLine`) as a `bodySmall` tertiary line; above 130% text (`fontScale > LIST_AT_FONT_SCALE`) put the bar on its own line under the name. Styles: `setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingVertical: 10, minHeight: 44 }`, `setName: { width: 104, fontSize: 16, fontWeight: '600' }`. Delete `tile*` styles.

- [ ] **Step 4: Typecheck and simulator** — `npx tsc --noEmit`; Log/History/Progress: rows fade under the chips in light and dark; empty composer shows a grey send button that turns sunrise when typing; Progress sets rows at default and largest text.

- [ ] **Step 5: Commit**

```bash
git add components
git commit -m "feat(ui): fade under the chat bar, quiet send button, sets as rows"
```

---

### Task 6: Design system doc and full check

**Files:**
- Modify: `DESIGN-SYSTEM.md`

- [ ] **Step 1: Update `DESIGN-SYSTEM.md`**
  - The Sky: palette G's four-stop table from the spec, the gradient reaches the base at 45% of the screen, a glow in every phase.
  - Colour: `indigo`/`onIndigo`, darker light `textTertiary`, new `background` values, `full_body` slate.
  - Colour: add the colour-jobs table from the spec; `cobalt` no longer marks planned (planned = ink dashed ring); `mint` only for the toast checkmark; remove the "old names" rollout note if no aliases remain (`grep -rn "colors\.\(primary\|secondary\|success\|accent\)\b" app components`).
  - Typography: `displaySmall` = Rounded Heavy 56, the hero number.
  - Components: add `SkySheet`, `Hero`, `SunArc`, `GoalBar`, `DayBars`; remove `Ring`, `GoalRing`, the Log ring tiles (now `TodaySummary`); `MuscleSetsCard` is rows.
  - Consistency › Titles: Progress's live fact moves into its hero when there are workouts.
  - Surfaces: tabs use one sheet; cards inside a sheet render as sections.

- [ ] **Step 2: Full check** per the consistency rule: on an iPhone 16e (375 pt class, `xcrun simctl boot "iPhone 16e"`) and iPhone 17, Log, History, Progress, Settings and a day screen; default and the largest Accessibility text size; light and dark; Reduce Motion and Reduce Transparency on. Note anything that truncates or overlaps and fix it in the owning component.

- [ ] **Step 3: Tests and types**

Run: `npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add DESIGN-SYSTEM.md
git commit -m "docs: design system for the Daylight polish"
```
