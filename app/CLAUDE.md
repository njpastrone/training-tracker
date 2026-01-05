# App Directory - Expo Router

This directory contains all routes using Expo Router's file-based routing.

## Structure
- `_layout.tsx`: Root layout with providers (Paper, SafeArea)
- `(tabs)/`: Tab navigator group
  - `_layout.tsx`: Tab bar configuration
  - `index.tsx`: Log tab (home) - workout input + recent workouts
  - `history.tsx`: History tab - calendar, streaks, analytics
  - `coach.tsx`: Coach tab - coming soon placeholder
  - `settings.tsx`: Settings tab - preferences, data management

## Routing Conventions
- Files become routes automatically
- `_layout.tsx` files wrap child routes
- Groups in parentheses `(tabs)` don't affect URL
- `index.tsx` is the default route for a directory

## Tab Navigation
Uses `@react-navigation/bottom-tabs` via Expo Router.
Tab icons from `react-native-paper` or `@expo/vector-icons`.
