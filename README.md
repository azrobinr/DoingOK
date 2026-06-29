# DoingOK

> Protecting vulnerable individuals through proactive wellness monitoring.

DoingOK is a nonprofit mobile app that prompts daily wellness check-ins for seniors, disabled individuals, and people with mental health concerns. If a user doesn't respond within a set window, a wellness alert is automatically escalated through their trusted contact chain via SMS.

---

## Project Structure

```
DoingOK/
├── apps/
│   └── mobile/          # Expo (React Native) app — iOS & Android
├── backend/             # Node.js / Fastify REST API
├── web/                 # React + Vite landing page and sign-up
├── packages/
│   └── shared/          # Shared TypeScript types (placeholder)
├── infra/
│   └── docker/          # docker-compose for local development
├── docs/
│   ├── adr/             # Architecture Decision Records
│   └── onboarding.md    # Developer environment setup guide
└── DoingOK_Architecture.md   # Full system architecture reference
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| API | Node.js + Fastify + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Job Scheduling | pg-boss (runs inside Postgres) |
| Alert Escalation | Own escalation loop + Twilio SMS |
| Auth | JWT + refresh token rotation |
| Mobile | Expo SDK 56 (React Native) — iOS & Android |
| Web | React 19 + Vite + Tailwind CSS |

Full architecture and schema documentation: [DoingOK_Architecture.md](DoingOK_Architecture.md)

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (required for running backend tests)

### Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, Twilio creds
npm install
npm run prisma:migrate       # run database migrations
npm run dev                  # starts API on http://localhost:3000
```

**Running tests** (requires Docker):

```bash
cd backend
npm run sandbox:test         # builds Docker image, runs Postgres, runs Vitest
```

The test suite has 93 tests across auth, users, contacts, checkins, escalation loop, and core loop.

### Web

```bash
cd web
npm install
npm run dev                  # starts Vite dev server on http://localhost:5173
npm run build                # production build → dist/
```

### Mobile

```bash
cd apps/mobile
npm install
npm test                     # Jest + React Native Testing Library (29 tests)
npx expo start               # start Expo dev server
```

For device builds, the app uses [Expo EAS Build](https://docs.expo.dev/build/introduction/):

```bash
eas build --profile preview --platform android
```

---

## How It Works

1. **User registers** — sets up profile, accepts terms, configures check-in schedule, adds trusted contacts in priority order
2. **Daily check-in prompt** — push notification sent at the user's scheduled time
3. **Missed check-in** — backend detects no response within the configured window and creates an alert
4. **SMS escalation** — contacts are notified one at a time via Twilio SMS, with a configurable delay between each step
5. **Alert resolved** — user responds late, or a contact acknowledges, or all contacts are exhausted (alert expires)

---

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | SMS sender number |
| `ENABLE_JOBS` | Set to `true` to activate background job scheduling |

---

## Contributing

We welcome contributions from developers, designers, and anyone who shares our mission. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

- Website: [doingok.org](https://doingok.org)
- Email: tech@doingok.org
- Issues: [GitHub Issues](https://github.com/azrobinr/DoingOK/issues)
