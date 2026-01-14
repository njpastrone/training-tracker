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
3. **Workout History**: Calendar view with streaks and frequency
4. **AI Coach**: Personalized training analysis and recommendations
5. **Local Storage**: Data persists on device

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
- `EXPO_PUBLIC_ANTHROPIC_API_KEY`: Claude API key (required)

## Commands
- `npm start`: Start Expo dev server
- `npm run ios`: Run on iOS simulator
