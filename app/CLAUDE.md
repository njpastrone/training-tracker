# App Directory - Expo Router

This directory contains all routes using Expo Router's file-based routing.

## Structure
- `_layout.tsx`: Root layout with providers (Paper, SafeArea)
- `(tabs)/`: Tab navigator group
  - `_layout.tsx`: Tab bar configuration
  - `index.tsx`: Today tab (home) - done today (training and food side by side), the next action, tomorrow, one coach line; logs from its bar
  - `training.tsx`: Training tab - this week's hero, the muscle grid (`components/GoalsCard.tsx`), lifts and the coach line, doors; the planner and missed-workout bar
  - `food.tsx`: Food tab - this week's hero, your goals a row each (`components/FoodGoalsCard.tsx`), the 4-week trend and the coach line, doors
  - `chat.tsx`: Chat tab - the log as one thread (`stores/chatStore.ts`), the coach, the opener; the gear opens Settings
- `calendar.tsx`: the record (from Month › on Training and Food): the calendar (every day opens `day/[date].tsx`) and every day by month
- `food-goals.tsx`: the food goal picker (protein, calories, low-GI meals, fiber); `meals.tsx`: today by meal (`components/MealTimeline.tsx`) and the last days with food
- `food-week.tsx`: food over the last 7 days (`components/FoodBreakdown.tsx`); `health.tsx`: Apple Health (`components/HealthCard.tsx`)
- `settings.tsx`: Settings (pushed from the gear on Chat) - preferences, backups, data management
- `goals.tsx`: set goals (each muscle N× a week, minimum sets per muscle, days a week, your own lift and frequency goals; food goals open the picker)

## Routing Conventions
- Files become routes automatically
- `_layout.tsx` files wrap child routes
- Groups in parentheses `(tabs)` don't affect URL
- `index.tsx` is the default route for a directory

## Tab Navigation
Uses native tabs (`expo-router/unstable-native-tabs`): the iOS Liquid Glass tab bar.
Tab icons are SF Symbols.
