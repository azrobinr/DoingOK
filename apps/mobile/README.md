# DoingOK Mobile App

React Native mobile application for iOS and Android.

## Core Screens (MVP)

- **Onboarding** — registration, TOS acceptance, contact setup
- **Daily Check-in** — one-tap "I'm OK" confirmation
- **Schedule Settings** — configure check-in time and window
- **Contacts** — manage trusted contact list and priority order
- **Alert History** — view past alerts and their resolution

## Scripts

```bash
npm run start     # Start Expo dev server
npm run ios       # Run on iOS simulator
npm run android   # Run on Android emulator
npm test          # Run tests
```

## Environment

API base URL and other config are set via `app.config.js`. See `../../.env.example`.
