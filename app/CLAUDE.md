# App Directory - Expo Router

This directory contains all routes using Expo Router's file-based routing.

## Structure
- `_layout.tsx`: Root layout with providers (Paper, SafeArea)
- `(tabs)/`: Tab navigator group
  - `_layout.tsx`: Tab bar configuration
  - `index.tsx`: Log tab (home) - workout input + recent workouts
  - `history.tsx`: History tab - calendar, streaks, analytics
  - `progress.tsx`: Progress tab - goals (`components/GoalsCard.tsx`), exercises (last done, how often, PRs), days since trained, and a box for adding missed workouts
  - `settings.tsx`: Settings tab - preferences, data management
- `goals.tsx`: set goals (each muscle N× a week, minimum sets per muscle, days a week, your own lift and frequency goals)

## Routing Conventions
- Files become routes automatically
- `_layout.tsx` files wrap child routes
- Groups in parentheses `(tabs)` don't affect URL
- `index.tsx` is the default route for a directory

## Tab Navigation
Uses native tabs (`expo-router/unstable-native-tabs`): the iOS Liquid Glass tab bar.
Tab icons are SF Symbols.
