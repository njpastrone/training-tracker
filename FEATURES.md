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
Log what you ate in the same box you log workouts with, in as much or as little detail as you like: "2 eggs and toast", "200g chicken and 1.5 cups of rice", "Big Mac and medium fries", or both at once: "did legs, squat 3x5 at 225, then ate 2 eggs and toast". One review card shows the workout and the food; tap an amount or a unit to change it, type a fix in the chat bar, Save. Food shows on each day's screen and as "Food today" on Log. Protein and calories up front; carbs, fat, fiber and where the numbers come from on tap.

### How it works
- **Router** (`services/claude.ts` `parseLog`, `services/foods.ts`): food words, eating words and kitchen amounts send a message to the food parser; exercises and workout words to the workout parser; both at once when both show. If the one that ran finds nothing, the other gets a try.
- **On the phone first:** a log of plain whole foods the table knows by name ("2 eggs and a banana", or the food part of "squat 3x5, then 2 eggs and toast") is read on the phone (`confidentLocal`): instant, free, no AI request. Everything else goes to the AI.
- **AI** (`server/src/food.ts`, the Worker's food mode): the app sends the log plus the table foods it mentions (`buildFoodCandidates`). The model picks the matching food and says how much; the app computes macros from USDA (`services/foodUnits.ts`). For brands, restaurants and homemade dishes the model gives a best guess, shown with an open dot and "≈".
- **Data** (`data/foods.ts`, built by `scripts/foods/build.ts` from `scripts/foods/picks.ts`): USDA FoodData Central (public domain). 822 hand-named foods with aliases and real portion weights, plus 2,369 more whole foods from SR Legacy for the long tail.
- **Amounts** (`services/foodUnits.ts`): g/kg/oz/lb, cups/tbsp/tsp/ml/fl oz/dl through each food's own USDA weights, counts and sizes, fractions and number words, "a handful", "a slice", "a scoop", "a knob", ranges, and amounts after the food ("chicken 200g").

### How to try it
1. `npm install`, then `npm start` and open the project in the existing LiftText dev build (no new native modules, so no new build is needed). `npm run ios` works too on a Mac with a simulator.
2. `.env.local` needs `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_PASSWORD` as today. The Worker that's deployed now already works: the app also sends the full prompt, which older Workers forward. Deploying the Worker (`cd server && npx wrangler deploy`) moves the food prompt server-side, like the workout parse.
3. On Log, try: "2 eggs and a banana" (read on the phone, instant), "chipotle chicken bowl" (AI estimate), "squat 3x5 at 225, then 2 eggs and toast" (both), "some rice" (a typical serving), then tap a row for carbs, fat and the USDA source, tap the unit to switch cups ↔ grams, or type "it was 3 eggs".
4. With AI off (Settings), common foods are still looked up on the phone.

### Decisions made
- **One composer, no Food tab:** the Log box takes a workout, food, or both; one review card; food on the day screens and "Food today" on Log.
- **Phone first for plain whole foods, AI for the rest:** on both gold sets the phone path is as accurate as the AI on the logs it takes, and it takes about 40% of food logs. That halves AI cost and daily-cap use for food, and those logs need no network. Sending everything to the AI is a one-line change in `parseLog`.
- **The AI never makes up numbers for a table food:** it picks the entry and the amount; USDA gives the numbers. Only branded, restaurant and homemade food is an AI estimate, marked "≈" and editable.
- **Defaults:**
  - Meat, fish, grains, pasta, rice and beans are cooked unless the log says raw or dry. Oats are dry; oatmeal is cooked.
  - A plain egg is hard-boiled (no added fat).
  - "Milk" is 2%, "greek yogurt" is nonfat plain, "chicken" is breast, "steak" is sirloin.
  - Firm tofu matches supermarket labels (about 78 kcal per 100 g). An avocado is a Hass, and "avocado" alone is half of one.
  - A name alone is your last logged amount of that food, else a typical serving.
  - A plural with no number ("eggs and toast") is two.
- **Where lookup runs:** in the app bundle (892 KB raw, about 145 KB gzipped). It's instant, works offline and with AI off, and needs no Worker change to update.
- **The model sees the "usual" food:** foods the log names outright are labelled `(usual for "greek yogurt")` in the candidate list. Long-tail foods are offered only for words the core table doesn't know, so near-duplicates never compete with the usual pick.
- **Containers go by the model's weight:** "a bowl of oatmeal" vs "a bowl of pasta" use the model's weight; every other unit uses USDA weights.
- **Same model and caps as workouts:** Haiku 4.5. Each AI request takes one slot of the existing daily caps. A workout plus a non-plain food is two requests.
- **Fixing:**
  - A fix that names a food or asks about its numbers goes to the food parser. A new day ("that was yesterday") moves both halves.
  - On the card: one-tap swaps to similar foods ("Rice, white, dry"), a unit chip that keeps the weight, and editable estimate numbers.
- **"Usual breakfast" chip:** what you logged around this time on at least 2 of the last 14 days.
- **Privacy:** the AI consent sheet now mentions food. People who already said yes aren't asked again.
- **Backups** include food. A backup from before food logging restores with no food.

### Accuracy
RESULTS_PLACEHOLDER

### Known gaps
GAPS_PLACEHOLDER

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