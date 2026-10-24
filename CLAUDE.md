# Training Tracker App

A mobile workout tracking app built with Expo (React Native) for iOS.

## Tech Stack
- **Framework**: Expo (React Native) with TypeScript
- **Navigation**: Expo Router (file-based routing in `app/` directory)
- **UI**: React Native Paper (Material Design)
- **State**: Zustand for global state management
- **Storage**: AsyncStorage for simple data, SQLite for structured workout data
- **AI**: Claude API for natural language workout parsing

## Project Structure
```
app/              # Expo Router pages (file-based routing)
  (tabs)/         # Tab navigator group
components/       # Reusable UI components
services/         # API and storage services
data/             # Static data (exercises list)
types/            # TypeScript type definitions
stores/           # Zustand state stores
constants/        # Theme, colors, config values
contexts/         # React contexts (Theme)
FEATURES.md       # Detailed feature implementation plans
DESIGN-SYSTEM.md  # UI component standards and design guidelines
```

## Key Features
1. **Natural Language Input**: Users describe workouts in plain text
2. **AI Parsing**: Claude API extracts structured workout data
3. **Four tabs, Today · Training · Food · Chat** (DESIGN-SYSTEM.md): Today shows what was done today side by side, the next action and tomorrow; Training and Food are twins (the goal and this week, a breakdown, a trend with one coach line, "More" doors to the calendar, exercises, goals, photos, Apple Health, food details)
4. **Training**: this week's muscle grid with sets, lifts with PRs and next targets, your own goals, the weekly check-in behind the coach line, planning and natural-language corrections in its bar
5. **Chat**: The fourth tab is the log as one thread (`stores/chatStore.ts`): every bar's logs, plans and questions land there; questions from any bar are answered there by the coach; Settings is behind its gear
6. **Local Storage**: Data persists on device

## Upcoming Features
See `FEATURES.md` for detailed implementation plans:
- **Quick-Track**: Workout templates and calendar scheduling for streamlined logging
- **Intra-Workout Trainer**: Context-aware AI guidance during workouts

## Coding Conventions
- Use TypeScript strict mode
- Functional components with hooks
- Use React Native Paper components for UI consistency
- Keep components small and focused
- Colocate styles with components using StyleSheet.create()
- **Follow DESIGN-SYSTEM.md** for UI standards, spacing, typography, and component patterns

## Environment Variables
- `EXPO_PUBLIC_API_URL`: URL of the Cloudflare Worker in `server/` that holds the Claude API key (required)
- `EXPO_PUBLIC_APP_PASSWORD`: shared app password the Worker checks (required)

## Commands
- `npm start`: Start Expo dev server
- `npm run ios`: Run on iOS simulator
