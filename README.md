# LiftText

A mobile workout tracking app built with Expo (React Native) that lets you log workouts using natural language. Powered by Claude AI for intelligent workout parsing.

## Features

- **Natural Language Input** - Just type what you did: "Hit chest today - bench press 3x10 at 185, incline dumbbell press, cable flyes"
- **AI-Powered Parsing** - Claude API extracts exercises, sets, reps, weights, and muscle groups automatically
- **Workout History** - Calendar of logged and planned days, and every day by month
- **Workout Planner** - Ask for a plan ("plan a re-entry week", "PPL split", or paste your own workouts), tweak it, then save it to the in-app calendar
- **Progress** - When you last did each exercise and how often, PRs where you logged numbers, days since each muscle group, and a box to add a workout you forgot ("did legs six days ago")
- **Goals** - Set goals on Progress (each muscle 1-3× a week, minimum sets per muscle, days a week, a weight to lift or an exercise to do often) and see them against your last 7 days; the planner aims at them
- **Chat** - The fourth tab is your log as one thread: everything you type into any box lands there with what came of it ("Logged · Push" with Open), kept on your phone and in backups. It opens on something timely (today's plan with Start / Not today, or a comeback line after a few days off) and its chips are questions from your own log. Ask the coach there, or type a question into any tab's box and Chat answers it: ask about your own training and food ("I've taken a few days off, what should I start with?", "what did I squat last Tuesday?"); it answers from a summary of your last 4 weeks and looks up the rest in your log, suggests a workout or meals you save with one tap, and offers to remember things you tell it (no dairy, a home gym), which you can see and forget in Settings
- **100+ Exercises** - Built-in database of common exercises organized by muscle group
- **Local Storage** - Workouts are saved only on your phone, with export/restore backups (see [Backing Up](#backing-up)). With AI reading on, what you type goes to Anthropic through the Worker; a question to the coach also sends a summary of your last 4 weeks, the things you asked it to remember and what the question needs (one exercise's history, a day's meals), never the whole log. Our server never stores what you type: it keeps daily request counts per phone (using a random ID, deleted after 2 days) and request logs without your text for 7 days. AI is for 18 and older; under 18 it stays off and nothing you type leaves the phone. The [privacy policy and terms](#privacy-policy-and-terms) say the rest.

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

The app never holds the Claude API key. A Cloudflare Worker in `server/` keeps the key as a secret, picks the model and effort per request (one per path in `server/src/`: Haiku 5.5 for workout and food logs, see `server/src/parse.ts` and `food.ts`; the app's own prompts such as the planner and the template parser go to `PASSTHROUGH` in `server/src/index.ts`), caps `max_tokens`, checks a shared app password, and enforces daily request caps per UTC day: one per app install (`DEVICE_DAILY_CAP` in `server/wrangler.jsonc`, default 20, keyed on a random id the app makes once and sends as `x-install-id`) and one across everyone (`DAILY_REQUEST_CAP`, default 300). App builds from before install ids all share one small bucket (`LEGACY_DAILY_CAP`, default 30) and still count against the global cap.

The app password ships inside the app, so treat it as a speed bump, not a lock; the daily cap is what limits the bill if a build leaks. The install id is made up by the app too, so someone with the password can rotate ids to get past the per-install cap; the global cap still bounds the bill, but they can use it up for everyone. App Attest (below) is the lock: with it enforced, only a genuine copy of the app on a real iPhone gets served, and the per-device cap is keyed on a key Apple attested instead of the install id.

### App Attest

Apple's [App Attest](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity) proves a request comes from a genuine copy of LiftText. Once per install the app makes a key in the Secure Enclave (`@expo/app-integrity`), has Apple attest it over a challenge from the Worker, and registers it (`POST /attest/register`). Every AI request then carries `x-attest-key-id`, `x-attest-challenge` (a fresh one from `POST /attest/challenge`) and `x-attest-assertion`: the request body signed with that key. The Worker (`server/src/attest.ts`) checks the attestation against Apple's root certificate, the challenge, the key id, the App ID and the counter, keeps the key in KV (`attest:<key id>`), and on each request checks the signature and that the counter went up. Challenges are signed timestamps (5 minutes), so they need no storage.

App Attest is on once the `APP_ATTEST_APP_ID` and `APP_ATTEST_CHALLENGE_SECRET` secrets are both set; until then the Worker skips it (no checks, no KV reads or writes for it), answers `/attest/*` with 503, and the app sends requests unsigned without making a key. `APP_ATTEST_MODE` in `server/wrangler.jsonc` rolls it out: `log-only` (the default) checks and logs every request but refuses none, so installs from before App Attest keep working; `enforce` refuses requests without a valid assertion (403, shown in the app). On a 403 the app retries once with a fresh assertion, and if that is refused too it attests a new key on the next request. Watch the Worker logs (`npx wrangler tail`, lines starting `attest`) until no current build is logged unsigned, then switch to `enforce` and deploy.

App Attest needs native code, so it ships in an EAS build (TestFlight or App Store), not an OTA update, and does not run in Expo Go or the simulator: there the app sends requests unsigned, which `enforce` refuses. The `com.apple.developer.devicecheck.appattest-environment` entitlement in `app.json` turns on the App Attest capability (EAS Build syncs it to the App ID; check it under Identifiers in the Apple Developer account if attestation fails).

### Deploy (one time)

```bash
cd server
npm install
npx wrangler login                        # opens the browser to your Cloudflare account
npx wrangler kv namespace create USAGE    # copy the printed id into wrangler.jsonc (kv_namespaces[0].id)
npx wrangler secret put ANTHROPIC_API_KEY # paste your Anthropic API key
npx wrangler secret put APP_PASSWORD      # choose a password to share with the app
npx wrangler secret put APP_ATTEST_APP_ID           # <Team ID>.com.njpastrone.trainingtracker (Team ID: Apple Developer account, Membership details)
npx wrangler secret put APP_ATTEST_CHALLENGE_SECRET  # any long random string, e.g. `openssl rand -base64 32`
npx wrangler secret put CONTACT_EMAIL     # required: the support address the privacy policy and terms show (503 without it)
npx wrangler deploy                       # prints the Worker URL
```

Leave `APP_ATTEST_MODE` on `log-only` until the app build with App Attest is what everyone runs (see App Attest above).

Then put the printed URL and the same password in `.env.local` at the repo root:

```bash
EXPO_PUBLIC_API_URL=https://training-tracker-api.<your-subdomain>.workers.dev
EXPO_PUBLIC_APP_PASSWORD=<the password you chose>
```

Restart `npm start` so Expo picks up the new values. To change the daily caps, edit `DEVICE_DAILY_CAP`, `LEGACY_DAILY_CAP` or `DAILY_REQUEST_CAP` and run `npx wrangler deploy` again (keep `DAILY_REQUEST_CAP` under 330: each request is three KV writes, and the free plan allows 1000 writes/day). To rotate the password, re-run `npx wrangler secret put APP_PASSWORD` and update `.env.local`.

Server tests (Node 22.18+): `cd server && npm test`

### Privacy policy and terms

The Worker serves the privacy policy and terms of use as plain pages at `GET /privacy` and `GET /terms` (`server/src/legal.ts`), with no password or cap, so they live at the same URL as the API and ship with each Worker deploy. Settings › About and the AI consent sheet link them; put `<Worker URL>/privacy` in App Store Connect (App Privacy) and the TestFlight test information. Both are marked DRAFT until a lawyer has read them. The contact address comes from the `CONTACT_EMAIL` secret, which is required: until it is set both pages answer 503 instead of a policy with no contact. When the app starts sending or keeping something new, update the policy in the same change.

The same Worker serves the website at lifttextapp.com (`server/src/site.ts`, custom domains in `server/wrangler.jsonc`; www redirects to the apex, and the workers.dev URL the app uses keeps working): a home page at `GET /` and a beta waitlist form that posts to `POST /waitlist`. Sign-ups are stored in the `USAGE` KV namespace as `waitlist:<email>` (value: sign-up time), capped at 25 a day and 5 per IP address a day (counted under a hash of the address). List them with `npx wrangler kv key list --binding USAGE --prefix waitlist: --remote`; remove one with `npx wrangler kv key delete --binding USAGE --remote waitlist:<email>`.

Workout logs are parsed with the prompt in `server/src/parse.ts`. The app sends `{ parse: { input, date, unit, exercises } }` (`exercises`: the candidate list from `server/src/identity.ts`), and the Worker builds the Claude request itself, so a prompt fix goes live with `npx wrangler deploy` and no app rebuild. Before changing the prompt, run the parsing eval (`npm run eval:parse`, see `evals/parse/README.md`).

Nothing is saved until you review the parsed workout. A typed fix in the chat bar while the review card is open ("actually 3x10, not 3x8"), or on a saved workout's screen, sends `{ parse: { input, date, unit, exercises, draft, fix } }`: correction mode returns the whole draft with the fix applied, plus a short `reply` when the fix is a question ("is pec deck machine flys?"), which the app shows on the card; a fix that changes nothing and asks nothing says so instead of doing nothing. When the question shows you call an exercise something else, the reply offers "Call it 'Machine flys' from now on", which saves your words as its name and alias, and cards then show "Machine flys · Pec Deck". A Worker deployed before correction mode ignores `draft` and `fix` and re-parses `input` (the draft written back as a log, plus the fix), so the app works with either; deploy the Worker (`cd server && npx wrangler deploy`) to get correction mode.

Questions to the coach use the prompt and tool schemas in `server/src/coach.ts` (Claude Sonnet 5.5). The app sends `{ coach: { date, unit, pack, messages, turnId } }`, where `pack` is the summary of the last 4 weeks built on the phone by `services/coachPack.ts` (including the things you asked the coach to remember). The phone drives a short loop (`services/ask.ts`): when the model asks for a tool (one exercise's history, a span of workouts or meals, sets per muscle, your usual meals, USDA numbers for a meal), the phone runs it over its own log (`services/coachTools.ts`) and sends the results back; the next call answers, and the Worker turns tools off for it. One question is one slot of the daily cap however many calls it takes (the Worker counts them under `turnId`, at most three). A suggested workout or meals come back as cards (`services/coachCards.ts`): exercises resolve to the catalog, a weight or a sentence in a card's notes with a number the model was never given is dropped, meal numbers are recomputed from the USDA table, and nothing is saved until you tap Plan or Log (planning over a day that already has a plan asks before replacing it). A "Remember '…'?" chip appears only when its quote is something you typed, and stores the fact only on a tap; Settings › What LiftText knows lists and forgets them. A Worker deployed before Phase 1 answers from the pack alone. Before changing the prompt, run the coach eval (`npm run eval:coach`, see `evals/coach/README.md`).

## Project Structure

```
training-tracker/
├── server/                 # Cloudflare Worker that proxies Claude calls and serves lifttextapp.com
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Log tab (home)
│   │   ├── history.tsx     # History & calendar
│   │   ├── progress.tsx    # Progress: goals, exercises, days since, corrections
│   │   └── chat.tsx        # Chat: your log as one thread, and the coach
│   ├── settings.tsx        # Settings (the gear on Chat)
│   ├── goals.tsx           # Set your goals
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

Before the first AI call, the app asks whether what you type may be sent to Anthropic and whether you're 18 or older (change it anytime in **Settings › AI reading**); anyone who answered before the age question is asked again. AI stays off under 18. With AI off, each line or comma you type becomes an exercise you fill in by hand.

### Planning a Week

Type what you want in the chat bar on the History tab ("Plan your week…"), or, after your first workout with nothing scheduled, tap **Plan my week** on the Log tab. The plan shows as a card on the page; adjust it with the tweak chips or a short note in the same bar, then tap **Plan it** to add the sessions to your calendar. Plan it replaces any not-completed sessions on the same dates. Undo from the History banner, or tap a planned day on the calendar, tap **Remove**, and choose **Delete the whole plan** to remove its upcoming sessions (completed workouts stay).

### Viewing History

History is the record; how it's going (streaks, PRs, goals) is on Progress. The History tab shows:
- Days logged (workouts or food) in the last 7 days and training days planned in the next 7
- A calendar of logged and planned days: last week, this week and next week (**Show full month** for the whole month)
- Your days by month, one row per day (its workout and muscles, then what you ate), a few months at a time (**Show earlier** for more)

Tap any day on the calendar to open it: its workouts, or its planned workout (**Remove** it, or for today **Start on Log**), or **Plan this day** for an empty today or future day (today also offers **Add workout**). Tap a workout to edit or delete it. To delete several at once (for example test entries), tap **Select** on the day or on the Days list, pick the workouts, and tap **Delete**. Any delete (Select, swipe, or the trash on a workout) shows **Undo** for a few seconds, which restores the workouts along with any calendar session they had completed.

### Backing Up

All data lives on the phone, the Chat thread too. It is included in the iPhone's normal iCloud device backup, and **Settings › Backup** adds:
- **Export backup** - saves workouts, food, plans, templates and schedule as one `.json` file via the share sheet (Files, iCloud Drive, AirDrop, ...)
- **Restore from backup** - picks a LiftText backup file and replaces the data on this phone. The current data is saved first as a safety file.
- **Import from Strong or Hevy** - picks the CSV export from either app, shows how many workouts, the date range and any skipped rows, then adds the workouts to History (asking kg or lb when the file doesn't say). Workouts already imported are not added again.
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
