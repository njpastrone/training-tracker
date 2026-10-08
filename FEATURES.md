# Training Tracker - Feature Implementation Plan

## Overview
This document outlines the next major features to be implemented in the Training Tracker app. Both features are designed to be lightweight, non-invasive, and integrate seamlessly with existing functionality.

The Coach tab has been replaced by **Progress** (`app/(tabs)/progress.tsx`): goals checked against the last 7 days (`services/goals.ts`, set in `app/goals.tsx`), each exercise with when it was last done and how often, PRs only where numbers were logged, days since each muscle group was trained, and natural-language corrections for missed workouts. Private progress photos are planned for the next native build.

## Feature 1: Intra-Workout Trainer

### Description
A lightweight, context-aware AI assistant that provides real-time guidance during workouts without requiring special modes or complex tracking.

### User Experience
- **Access Point**: Small "Ask Coach" button on the main Log tab (near recent workouts section)
- **Context Awareness**: Automatically knows what exercises have been logged today
- **Interface**: Chat-style questions will live in the planned "Ask about your training" sheet on Progress (a later PR)

### Key Capabilities
- Answer workout-specific questions:
  - "Should I do another set?"
  - "What accessories pair well with today's workout?"
  - "My shoulders are sore, what can I substitute for overhead press?"
- Provide form cues and technique reminders
- Suggest adjustments based on fatigue or time constraints
- Recommend exercise alternatives for equipment availability

### Technical Implementation
- **Service**: Extend `services/coach.ts` with new function:
  ```typescript
  getIntraWorkoutAdvice(
    question: string,
    todaysWorkout: Workout[],
    recentWorkouts: Workout[]
  ): Promise<string>
  ```
- **Context Data**:
  - Today's logged exercises (real-time)
  - Last 7-14 days of workout history
  - Current workout patterns/split
- **AI Prompt**: Specialized prompt focused on mid-workout decision making

### Implementation Priority: MEDIUM
- Builds on the planned Ask sheet on Progress
- High user value with minimal UI changes

---

## Feature 2: Quick-Track (Templates & Scheduling)

### Description
Streamlined workout planning and logging through templates and calendar scheduling, making it easy to follow structured programs.

### Components

#### A. Workout Templates
- **Location**: New "Templates" section in Settings or dedicated tab
- **Creation Methods**:
  - Manual: Add exercises with default sets/reps
  - Natural Language: "Create push day: bench 5x5, OHP 4x8, dips 3x12..."
  - From History: Convert a previous workout into a template
- **Template Structure**:
  ```typescript
  {
    id: string;
    name: string; // "Push Day", "Leg Day", etc.
    exercises: [{
      name: string;
      sets: number;
      reps: number;
      weight?: number; // optional default
      notes?: string;
    }];
    createdAt: string;
  }
  ```

#### B. Calendar Scheduling
- **Location**: Enhanced History tab with calendar view
- **Features**:
  - Tap future dates to schedule workouts
  - Select template to use
  - Set recurring schedules (e.g., "Every Monday")
  - Visual indicators for scheduled workouts
  - Deload weeks: Mark any week as deload
- **Today's Workout**: 
  - Scheduled workout appears at top of Log tab
  - "Start [Template Name]" button for quick logging

#### C. Quick Logging Flow
1. User sees "Start Push Day" on Log tab
2. Tap to auto-populate workout input with template
3. User can modify exercises/sets/weights as needed
4. Submit through normal parsing flow
5. Workout is saved with reference to template

### Technical Implementation

#### Storage Design
- **Templates**: AsyncStorage with key `@training-tracker/templates`
  ```typescript
  templates: Template[]
  ```
- **Schedule**: AsyncStorage with key `@training-tracker/schedule`
  ```typescript
  schedule: [{
    date: string; // ISO date
    templateId: string;
    isRecurring: boolean;
    recurringPattern?: 'weekly' | 'biweekly';
  }]
  ```

#### New Functions
- `services/templates.ts`:
  - `createTemplate()`
  - `parseTemplateFromNL()`
  - `getTemplates()`
  - `deleteTemplate()`
- `services/schedule.ts`:
  - `scheduleWorkout()`
  - `getScheduledWorkout()`
  - `getWeekSchedule()`
  - `cancelScheduledWorkout()`

#### UI Components
- `components/TemplateCard.tsx`: Display template with exercises
- `components/ScheduleCalendar.tsx`: Calendar with scheduled workouts
- `components/QuickStartCard.tsx`: Today's scheduled workout card

### Implementation Priority: HIGH
- Significantly improves daily usage flow
- Reduces friction for consistent training
- Natural extension of existing logging

---

## Feature 3: Food logging (prototype)

### Description
Log what you ate in the same box you log workouts with, in as much or as little detail as you like, in plain words, slang, typos, emoji or another language: "2 eggs and toast", "200g chicken and 1.5 cups of rice", "chipotle bowl w chicken and guac", "2 huevos y arroz", or both at once: "did legs, squat 3x5 at 225, then ate 2 eggs and toast". One review card shows the workout and the food; tap an amount or a unit to change it, type a fix in the chat bar, Save. Food shows on each day's screen and as "Food today" on Log. Protein and calories up front; carbs, fat, fiber and where the numbers come from on tap.

### How it works
- **Router** (`services/claude.ts` `parseLog`, `services/foods.ts`): food words, eating words, kitchen amounts, food emoji and common foreign food words send a message to the food parser; exercises and workout words to the workout parser; both at once when both show. If the one that ran finds nothing, the other gets a try.
- **AI on every food log, grounded in USDA** (`server/src/food.ts`, the Worker's food mode): Claude Haiku 5.5 reads every food log; when its reply is cut off, refused or unreadable, or it lists foods that are all unusable or less than 0.8 confident (`needsEscalation`, about 1 log in 7; a finished "no food" reply is not escalated), the Worker re-sends it to Claude Sonnet 5.5 on the same cap slot. The Worker caches the food system prompt. Typed fixes go to Sonnet. The app sends the log plus the USDA table foods it mentions (`buildFoodCandidates`; foods the log names outright are labelled "usual for …"). The model picks the matching food and says how much; the app computes macros from USDA (`services/foodUnits.ts`). For brands, restaurants and homemade dishes the model gives a best guess, shown with an open dot and "≈".
- **AI off, or at the daily cap / server busy:** the phone reads the food itself: each comma or line as amount + food, matched to the table (`localFoodParse`); the workout half gets the no-AI parse. Other refusals (e.g. a wrong app password) still show as errors.
- **Data** (`data/foods.ts`, built by `scripts/foods/build.ts` from `scripts/foods/picks.ts`): USDA FoodData Central (public domain). 822 hand-named foods with aliases and real portion weights, plus 2,369 more whole foods from SR Legacy for the long tail (offered only for words the core table doesn't know).
- **Amounts** (`services/foodUnits.ts`): g/kg/oz/lb, cups/tbsp/tsp/ml/fl oz/dl through each food's own USDA weights, counts and sizes, fractions and number words, "a handful", "a slice", "a scoop", "a knob", ranges, and amounts after the food ("chicken 200g"). An exact amount is converted; a vague one ("some", "a big bowl", "medium fries") takes the model's weight, which reads the context.

### How to try it
1. `npm install`, then `npm start` and open the project in the existing LiftText dev build (no new native modules, so no new build is needed). `npm run ios` works too on a Mac with a simulator.
2. `.env.local` needs `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_PASSWORD` as today. **Deploy the Worker** (`cd server && npx wrangler deploy`) to get the food mode (Haiku 5.5, Sonnet 5.5 when unsure). Before that, the Worker that's deployed now still answers food logs (the app also sends the prompt, which older Workers forward), but on its own model, Haiku 4.5, which lands about 10 points fewer logs within 20%.
3. On Log, try: "2 eggs and a banana", "chipotle chicken bowl w white rice black beans and guac", "squat 3x5 at 225, then 2 eggs and toast", "some rice", "desayuné dos huevos y café con leche", "🍳🍳 + 🥑 toast", then tap a row for carbs, fat and the USDA source, tap the unit to switch cups ↔ grams, or type "it was 3 eggs".
4. With AI off (Settings), common foods are still looked up on the phone.

### Decisions made
- **One composer, no Food tab:** the Log box takes a workout, food, or both; one review card; food on the day screens and "Food today" on Log.
- **Haiku 5.5 on every food log, Sonnet 5.5 only when Haiku is unsure** (confidence below 0.8, or a reply that's cut off, refused or unreadable): as accurate as Sonnet on every log at about a quarter of the cost (see Accuracy). This is the design from the pipeline scout (`claude-haiku-5-5`, $0.10/$0.50 per million tokens). Grounding in the USDA table beat Haiku 4.5 by 10 points and ties the AI alone at lower cost. Reading plain logs on the phone first was as accurate but took only 11% of realistic messages, so it isn't worth a second path; the phone parser stays for AI off.
- **The AI never makes up numbers for a table food:** it picks the entry and the amount; USDA gives the numbers. Only branded, restaurant and homemade food is an AI estimate, marked "≈" and editable.
- **Defaults:** cooked for meat, fish, grains, pasta, rice and beans unless the log says raw or dry; oats dry, oatmeal cooked; a plain egg hard-boiled (no added fat); "milk" is 2%, "greek yogurt" nonfat plain, "chicken" breast, "steak" sirloin; firm tofu like supermarket labels (about 78 kcal per 100 g); an avocado is a Hass, and "avocado" alone is half of one. A plain name is a typical serving; a vague amount ("some rice") is the model's weight. A name alone is the weight or volume you last logged of that food when you've logged one; counts aren't remembered ("banana" is one banana even after "3 bananas"). A plural with no number ("eggs and toast") is two.
- **Where lookup runs:** in the app bundle (892 KB raw, about 145 KB compressed): instant, works offline and with AI off, needs no Worker change to update.
- **Same caps as workouts:** each AI request takes one slot of the existing daily caps; a workout plus food is two requests. An escalated log is still one slot. 5.x models take no temperature and think by default, so the request sends no temperature and allows 4,096 output tokens (thinking counts toward it; only what's used is billed).
- **Fixing:** a fix that names a food or asks about its numbers goes to the food parser; a new day ("that was yesterday") moves both halves. On the card: one-tap swaps to similar foods ("Rice, white, dry"), a unit chip that keeps the weight, and editable estimate numbers.
- **"Usual breakfast" chip:** what you logged around this time on at least 2 of the last 14 days.
- **Privacy:** the AI consent sheet now mentions food; people who already said yes aren't asked again.
- **Backups** include food. A backup from before food logging restores with no food.
- **Where food shows (one record, 2026-10-08):** a day holds its training and its food. The day screen has Training and Food sections and edits saved food in place; the History calendar marks days with food and its list is Days (workout card plus a food line, or a quiet food-only card); Progress has a "Food · last 7 days" card; Goals has protein a day, checked on the days with food logged in the last 7. Each appears only once there is food, so lift-only users see nothing new. Log's top is unchanged.

### Accuracy
Measured 2026-10-08 through `claude -p` (`npm run eval:food -- --cli`; no API key was available, so temperature isn't pinned and results move about 2 points run to run; confirm with an API-key run before release). A hit is a meal total within 20% (or 10%) of the reference, or within 25 kcal / 3 g for small numbers. Every reference number has a source (a USDA FoodData Central id and grams, or the brand's label).

- **Dev set** (tuned on): the research scout's 199 cases plus 122 written for this build.
- **Held-out set** (never tuned on): 340 messages written by three separate agents the way people text and dictate: slang, typos, voice-to-text errors, run-ons, vague amounts, corrections, emoji, other languages and units, brands and chains, drinks and alcohol, homemade and international dishes, workout plus food, and messages with no food.

| Held-out (340) | kcal 20% | protein 20% | kcal 10% | all 4 | escalated | $ per log |
|---|---|---|---|---|---|---|
| **The app: Haiku 5.5, Sonnet 5.5 when unsure, tuned prompt** (2 runs) | **85%** | **85%** | **68%** | 67% | 16% | $0.0023 |
| Same, before tuning (scout's prompt, 1 run) | 84% | 85% | 67% | 67% | 14% | $0.0018 |
| Haiku 5.5 alone, tuned prompt (2 runs) | 84% | 84% | 66% | 65% | – | $0.0007 |
| Sonnet 5.5 on every log (the previous design) | 85% | 85% | 67% | 67% | – | $0.0083 |
| AI alone (no USDA table), Sonnet 5.5 | 86% | 85% | 65% | – | – | $0.0089 |
| AI every log, grounded, Haiku 4.5 | 75% | 77% | 62% | – | – | $0.0029 |
| No AI (AI off) | 40% | 45% | 27% | – | – | $0 |

| Dev (321, tuned on) | kcal 20% | protein 20% | all 4 | escalated | $ per log |
|---|---|---|---|---|---|
| **The app, tuned prompt** (2 runs) | **92%** | **91%** | 79% | 11% | $0.0016 |
| The app, before tuning (2 runs) | 89% | 90% | 76% | 12% | $0.0015 |
| Sonnet 5.5 on every log | 89% | 90% | 76% | – | $0.0075 |
| AI every log, grounded, Haiku 4.5 | 80% | 84% | 67% | – | $0.0027 |

- **Prompt tuning reached 90%+ on dev but not on held-out.** Tuned on dev only: usual amounts for butter, milk, nut butter and toppings when none is given (the app had been using a full table serving), an unbranded protein shake is one scoop of powder, an unbranded bar a typical 60 g bar, a bowl of yogurt or oatmeal about a cup, a piece of fish a 6 oz fillet; the reader also takes the last whole JSON when a reply corrects itself. Dev rose 3 points on kcal; held-out moved about 1 point, within run-to-run noise.
- **What keeps held-out at 85%:** dishes. International dishes land 50% within 20%, homemade named dishes 63%, dishes named in other languages 68%; every other category is 75–100% (branded 94%, restaurant 90%, units, typos, corrections and drinks 100%). Those dish guesses miss on both sides of the reference about equally (30 under, 22 over across two runs), so there's no bias a prompt rule can correct: the "right" portion of a homemade dish is itself a convention. The next lever is grounding dishes in USDA FNDDS mixed dishes (their recipes and portion weights) the way whole foods are grounded now.
- Workout parsing didn't regress: `npm run eval:parse -- --cli` scores 0.990 (107 of 114 perfect, 0 silent mismatches; 0.992 before, within noise). The workout prompt is unchanged.
- Cost: about $0.002 per food log uncached (thinking included), against $0.008 for Sonnet on every log: about $0.21 a month for someone logging food 3 times a day. The Worker caches the food prompt (about 3,000 of the ~3,600 input tokens per log); with a warm cache the scout computed about half that. The CLI can't show the Worker's cache, so confirm with an API-key run.
- Latency is about Sonnet's for most logs; an escalated log waits for two calls.

### Known gaps
- Not run on a phone here (no iOS simulator on this machine); the PR's screenshots are web renders from the pipeline's test step, and the logic is covered by tests (196 app tests, 48 Worker tests).
- CLI evals only: confirm with `npm run eval:food -- --set holdout` on an API key before release (about $0.60), and check the Worker log's `cache_read_input_tokens` is above 0. Haiku 5.5 thinks about 500 tokens per log at its default effort (most of its cost); turning thinking off couldn't be tested through the CLI. A refusal from Haiku goes to Sonnet; no other refusal fallback. Haiku 5.5 is a day old.
- Estimates are estimates: dish and restaurant portions are the main miss. Slice conventions can differ from what people mean (deli vs roast turkey, bacon thickness); the swap chip fixes it in one tap.
- A workout plus food is two AI requests, so two slots of the daily caps.
- Not built yet: "same as yesterday", saved meals, quick-adding raw numbers ("450 cal 30 g protein"), hidden-fat nudges ("cooked in oil?"), food on Log's Recent.
- The food table adds 892 KB to the app's code (about 145 KB compressed over the air); the long tail (720 KB) could move to the Worker later.

---

## Implementation Order

### Phase 1: Quick-Track Templates (Week 1)
1. Create template storage and management functions
2. Add Templates section to Settings
3. Implement manual template creation
4. Add "Create from History" feature
5. Implement NL template parsing

### Phase 2: Calendar Scheduling (Week 2)
1. Create schedule storage functions
2. Add calendar view to History tab
3. Implement workout scheduling UI
4. Add recurring workout support
5. Create "Today's Workout" card for Log tab

### Phase 3: Quick Logging Integration (Week 3)
1. Connect templates to workout input
2. Implement auto-populate from template
3. Add template reference to saved workouts
4. Test full quick-track flow

### Phase 4: Intra-Workout Trainer (Week 4)
1. Extend coach service with workout context
2. Add "Ask Coach" button to Log tab
3. Implement context-aware Q&A
4. Test with various workout scenarios

---

## Success Metrics
- **Quick-Track**: 50%+ reduction in time to log workouts
- **Intra-Workout**: Users get helpful mid-workout guidance
- **Overall**: Increased workout consistency and adherence

## Non-Goals
- Complex periodization or auto-regulation
- Invasive UI changes or new modes
- Real-time set tracking during workouts
- Social features or sharing

## Future Considerations
- Export/import templates for sharing
- Progress tracking against templates
- AI-suggested template modifications based on progress
- Integration with wearables for auto-detection