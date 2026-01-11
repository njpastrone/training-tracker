# Training Tracker - Feature Implementation Plan

## Overview
This document outlines the next major features to be implemented in the Training Tracker app. Both features are designed to be lightweight, non-invasive, and integrate seamlessly with existing functionality.

## Feature 1: Intra-Workout Trainer

### Description
A lightweight, context-aware AI assistant that provides real-time guidance during workouts without requiring special modes or complex tracking.

### User Experience
- **Access Point**: Small "Ask Coach" button on the main Log tab (near recent workouts section)
- **Context Awareness**: Automatically knows what exercises have been logged today
- **Interface**: Uses existing Coach tab's chat interface for Q&A

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
- Builds on existing coach infrastructure
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