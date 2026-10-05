# LiftText

A mobile workout tracking app built with Expo (React Native) that lets you log workouts using natural language. Powered by Claude AI for intelligent workout parsing.

## Features

- **Natural Language Input** - Just type what you did: "Hit chest today - bench press 3x10 at 185, incline dumbbell press, cable flyes"
- **AI-Powered Parsing** - Claude API extracts exercises, sets, reps, weights, and muscle groups automatically
- **Workout History** - Calendar view showing your workout frequency and streaks
- **Workout Planner** - Ask for a plan ("plan a re-entry week", "PPL split", or paste your own workouts), tweak it, then save it to the in-app calendar
- **Streak Tracking** - Stay motivated with current and longest streak counters
- **100+ Exercises** - Built-in database of common exercises organized by muscle group
- **Local Storage** - Your data stays on your device, with export/restore backups (see [Backing Up](#backing-up))

## Screenshots

*Coming soon*

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native) with TypeScript
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- **UI**: [React Native Paper](https://reactnativepaper.com/) (Material Design)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Storage**: AsyncStorage for persistent local data
- **AI**: [Claude API](https://www.anthropic.com/) for natural language parsing, called through a small [Cloudflare Worker](https://workers.cloudflare.com/) (`server/`) so the API key never ships in the app

## Getting Started

### Prerequisites

- Node.js 20.19.4+
- npm or yarn
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your phone
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)
- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account (hosts the API server)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/njpastrone/training-tracker.git
   cd training-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy the API server (see [API server](#api-server) below), then create `.env.local`:
   ```bash
   cp .env.example .env.local
   # Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_APP_PASSWORD
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on your preferred platform:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## API Server

The app never holds the Claude API key. A Cloudflare Worker in `server/` keeps the key as a secret, picks the model (`claude-haiku-4-5-20251001`), caps `max_tokens`, checks a shared app password, and enforces a global daily request cap (`DAILY_REQUEST_CAP` in `server/wrangler.jsonc`, default 200/day UTC).

The app password ships inside the app, so treat it as a speed bump, not a lock; the daily cap is what limits the bill if a build leaks.

### Deploy (one time)

```bash
cd server
npm install
npx wrangler login                        # opens the browser to your Cloudflare account
npx wrangler kv namespace create USAGE    # copy the printed id into wrangler.jsonc (kv_namespaces[0].id)
npx wrangler secret put ANTHROPIC_API_KEY # paste your Anthropic API key
npx wrangler secret put APP_PASSWORD      # choose a password to share with the app
npx wrangler deploy                       # prints the Worker URL
```

Then put the printed URL and the same password in `.env.local` at the repo root:

```bash
EXPO_PUBLIC_API_URL=https://training-tracker-api.<your-subdomain>.workers.dev
EXPO_PUBLIC_APP_PASSWORD=<the password you chose>
```

Restart `npm start` so Expo picks up the new values. To change the daily cap, edit `DAILY_REQUEST_CAP` and run `npx wrangler deploy` again (keep it under 1000: each request is one KV write, and the free plan allows 1000 writes/day). To rotate the password, re-run `npx wrangler secret put APP_PASSWORD` and update `.env.local`.

Server tests (Node 22.18+): `cd server && npm test`

Workout logs are parsed with the prompt in `server/src/parse.ts`. The app sends `{ parse: { input, date, unit, exercises } }` (`exercises`: the candidate list from `server/src/identity.ts`), and the Worker builds the Claude request itself, so a prompt fix goes live with `npx wrangler deploy` and no app rebuild. Before changing the prompt, run the parsing eval (`npm run eval:parse`, see `evals/parse/README.md`).

Nothing is saved until you review the parsed workout. A typed fix under the review card ("actually 3x10, not 3x8"), or on a saved workout's screen, sends `{ parse: { input, date, unit, exercises, draft, fix } }`: correction mode returns the whole draft with the fix applied. A Worker deployed before correction mode ignores `draft` and `fix` and re-parses `input` (the draft written back as a log, plus the fix), so the app works with either; deploy the Worker (`cd server && npx wrangler deploy`) to get correction mode.

## Project Structure

```
training-tracker/
├── server/                 # Cloudflare Worker that proxies Claude calls
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Log tab (home)
│   │   ├── history.tsx     # History & calendar
│   │   ├── coach.tsx       # AI Coach (weekly report + chat)
│   │   └── settings.tsx    # App settings
│   └── _layout.tsx         # Root layout
├── components/             # Reusable UI components
├── services/               # API integrations
├── stores/                 # Zustand state management
├── data/                   # Static data (exercises)
├── types/                  # TypeScript definitions
├── constants/              # Theme & configuration
├── DESIGN-SYSTEM.md        # UI standards & component guidelines
└── FEATURES.md            # Detailed feature implementation plans
```

## Usage

### Logging a Workout

Type naturally in the input box:
- "Just hit chest - bench press, incline press, cable flyes"
- "Leg day: squats 5x5 at 225, leg press, lunges"
- "Quick arm workout - curls 3x12, tricep pushdowns, hammer curls"

The AI will parse your input and extract:
- Exercise names
- Sets and reps (sets at different weights become separate entries)
- Weight (in your default unit unless you say otherwise)
- Duration and distance for cardio
- Muscle groups worked
- Notes for anything else you mention (how it felt, pain, PRs, supersets, RPE)

You can log several days at once ("yesterday squats 5x5 225, today bench 3x8 185"); each day is saved as its own workout.

### Planning a Week

Tap **Plan your week** on the Log tab (shown when nothing is scheduled) or the **Plan** chip on the History calendar. Describe what you want, adjust the plan with the tweak chips or a short note, then tap **Plan it** to add the sessions to your calendar. Plan it replaces any not-completed sessions on the same dates. Undo from the History banner, or tap a planned day on the calendar and choose **Delete Plan** to remove its upcoming sessions (completed workouts stay).

### Viewing History

The History tab shows:
- Calendar heatmap of workout days
- Current streak
- Weekly/monthly workout counts
- Longest streak record

### Backing Up

All data lives on the phone. It is included in the iPhone's normal iCloud device backup, and **Settings › Backup** adds:
- **Export backup** - saves workouts, plans, templates and schedule as one `.json` file via the share sheet (Files, iCloud Drive, AirDrop, ...)
- **Restore from backup** - picks a LiftText backup file and replaces the data on this phone. The current data is saved first as a safety file.
- **Weekly backup** - on app launch, saves a file at most once a week to Files › On My iPhone › LiftText › Backups (keeps the last 8). This folder is on the phone, not in iCloud Drive; it leaves the phone only through the iCloud device backup.

## Releasing to TestFlight

Config lives in `app.json` (bundle ID `com.njpastrone.trainingtracker`) and `eas.json`. Build numbers are managed remotely by EAS and auto-increment on production builds.

**Merges auto-ship.** Every push to `main` (including PR merges) runs the EAS Workflow in `.eas/workflows/testflight.yml`. It fingerprints the native side of the app (native dependencies, config plugins, `app.json`, icon, permissions) and then:

- **App-code-only change** (same fingerprint as an existing production build): publishes an over-the-air update to the `production` channel. Free, no build spent; installed apps pick it up on their next launch or two.
- **Native change** (new dependency with native code, `app.json`/plugin change, icon, permissions, SDK upgrade): builds the production iOS app and submits it to TestFlight, where it reaches the internal `Team (Expo)` group.

OTA updates only carry JavaScript and assets. They can't change native code, the app icon, permissions or anything else baked into the binary — those always need a build, and the fingerprint check triggers one automatically.

Requires the GitHub repo to be linked to the Expo project (expo.dev → project → GitHub). Watch runs at expo.dev or with `npx eas-cli workflow:runs`.

- **Force a full build:** put `[release]` in the commit message (for a squash merge, in the merge commit title or body), or run it by hand: `npx eas-cli workflow:run .eas/workflows/testflight.yml -F force_build=true`. EAS Workflows can't read PR labels on a push, so a label won't do it.
- **Skip everything:** put `[eas skip]` (or `[skip eas]` / `[no eas]`) in the commit message.
- **Build quota:** the Expo free plan includes 15 iOS builds per month; only native changes and forced builds spend one. Check what's left with `npx eas-cli account:usage` (or expo.dev → account → Usage).

Manual one-time and per-release steps (run by the account owner):

1. `npx eas-cli login`
2. `npx eas-cli init` (links the project; writes `projectId`/`owner` into `app.json` — commit that)
3. Set the app's runtime secrets as EAS environment variables for the production environment (expo.dev → project → Environment variables, or `npx eas-cli env:create`): the backend URL (`EXPO_PUBLIC_API_URL`) and the app password variable introduced by the key-server change. `EXPO_PUBLIC_*` values are baked into the build.
4. `npx eas-cli build --platform ios --profile production` (first run prompts for Apple login and creates certificates)
5. `npx eas-cli submit --platform ios --latest`
6. In App Store Connect → TestFlight: create an external testing group, fill in the beta app description and feedback email, then enable the public link and share it.

The `development` profile needs `npx expo install expo-dev-client` first.

## Roadmap

- [ ] AI Coach tab with personalized advice
- [ ] Voice input for hands-free logging
- [ ] Cloud sync with user accounts
- [ ] Workout templates
- [ ] Progress charts and analytics
- [ ] Apple Watch companion app

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow the **DESIGN-SYSTEM.md** for UI consistency and component standards
- Use TypeScript strict mode
- Follow the established project structure and coding conventions
- Test on both iOS and Android when possible

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- UI components from [React Native Paper](https://reactnativepaper.com/)
