# Services Directory

API integrations and data persistence services.

## Services
- `claude.ts`: Claude API integration for parsing workout text
- `storage.ts`: AsyncStorage helpers for simple key-value data
- `database.ts`: SQLite database for structured workout data

## Claude API Service
- Calls Claude through the Cloudflare Worker in `server/` (`callClaude`); the Worker holds the key and picks the model
- Workout-log parsing prompt lives in `server/src/parse.ts` (shared with the Worker and `evals/parse`)
- Returns structured Exercise[] from natural language
- Handles errors gracefully with fallbacks

## Storage Patterns
- Use async/await for all storage operations
- Wrap in try/catch for error handling
- Storage keys prefixed with `@training-tracker/`

## Database Schema
Workouts table:
- id (TEXT PRIMARY KEY)
- date (TEXT - ISO date)
- exercises (TEXT - JSON string)
- rawInput (TEXT)
- muscleGroups (TEXT - JSON string)
- createdAt (TEXT - ISO timestamp)
