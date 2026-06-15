# DoingOK API

Node.js + Fastify REST API for the DoingOK wellness monitoring platform.

## Structure

```
src/
  auth/           JWT issuance, refresh tokens, password hashing
  users/          Profile management, TOS acceptance
  contacts/       Trusted contact management
  checkins/       Check-in schedules and event recording
  alerts/         GoAlert API integration, alert state
  notifications/  Push notification delivery (FCM + APNs)
  metrics/        Aggregated reporting
  lib/            Shared utilities (db client, logger, error types)
  index.ts        App entry point
```

## Scripts

```bash
npm run dev       # Start with hot reload
npm run build     # Compile TypeScript
npm run start     # Run compiled build
npm test          # Run tests
npm run lint      # ESLint
```

## Environment

See `../../.env.example` for required variables.
