# Training Tracker

A mobile workout tracking app built with Expo (React Native) that lets you log workouts using natural language. Powered by Claude AI for intelligent workout parsing.

## Features

- **Natural Language Input** - Just type what you did: "Hit chest today - bench press 3x10 at 185, incline dumbbell press, cable flyes"
- **AI-Powered Parsing** - Claude API extracts exercises, sets, reps, weights, and muscle groups automatically
- **Workout History** - Calendar view showing your workout frequency and streaks
- **Streak Tracking** - Stay motivated with current and longest streak counters
- **100+ Exercises** - Built-in database of common exercises organized by muscle group
- **Local Storage** - Your data stays on your device

## Screenshots

*Coming soon*

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native) with TypeScript
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- **UI**: [React Native Paper](https://reactnativepaper.com/) (Material Design)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Storage**: AsyncStorage for persistent local data
- **AI**: [Claude API](https://www.anthropic.com/) for natural language parsing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your phone
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)

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

3. Create a `.env` file with your Anthropic API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on your preferred platform:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
training-tracker/
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Log tab (home)
│   │   ├── history.tsx     # History & calendar
│   │   ├── coach.tsx       # AI Coach (coming soon)
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
- Sets and reps
- Weight (if mentioned)
- Muscle groups worked

### Viewing History

The History tab shows:
- Calendar heatmap of workout days
- Current streak
- Weekly/monthly workout counts
- Longest streak record

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
