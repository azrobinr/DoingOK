# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DoingOK** is a nonprofit technology that protects the well-being of vulnerable individuals (seniors, disabled individuals, people with mental health concerns) through:
- Daily wellness check-in prompts via a mobile app
- Automated alert escalation to trusted contacts if a check-in is missed
- Integration with GoAlert (self-hosted on-call platform) for escalation management

The project architecture is documented in detail in `DoingOK_Architecture.md` — read it for context on system design, database schema, API structure, and tech stack decisions.

## Current State

The repository currently contains:
- **`web/`** — React + Vite frontend (landing page, sign-up, donor, FAQ, responsive design with accessibility focus)
- **`alpha/`** — POC artifacts (NestJS starter, alert escalation demos)
- **Backend not yet implemented** — planned as Node.js + Fastify with TypeScript, Prisma ORM, PostgreSQL, pg-boss for job scheduling

## Development Commands

All commands run from the `web/` directory (where `package.json` lives).

### Dev Server
```bash
npm run dev
# Starts Vite dev server on http://localhost:5173
# Hot module replacement (HMR) enabled
```

### Build for Production
```bash
npm run build
# Outputs optimized bundle to `dist/`
```

### Preview Production Build
```bash
npm run preview
# Serves the `dist/` directory locally to test production build
```

### Linting
```bash
npm run lint
# ESLint with React Hooks rules and React Refresh plugin
# Uses Oxc parser for speed
```

### Verification/E2E Testing
```bash
npx playwright install  # One-time: install browser engines
node verify.js          # Runs 14 automated test steps via Playwright
```
The `verify.js` script tests:
- Landing page load, navigation, and routing
- Font size toggle (Normal → Large → Extra Large) and localStorage persistence
- Sign-up form field input and T&C scroll-to-accept requirement
- Donor and FAQ page navigation
- Mobile responsiveness (375px viewport, hamburger menu)

Screenshots are saved to `/tmp/doingok-screenshots/`.

## Code Architecture

### Frontend Structure (`web/src/`)

**State Management:**
- Centralized in `App.jsx`: `currentSection` (route), `fontSize` (persisted to localStorage)
- Passed down via props to `Navigation` and rendered components

**Components:**
- `Navigation.jsx` — Header with logo, nav links, font size toggle (A / A+ / A++)
- `Landing.jsx` — Hero, mission, features, testimonials, basic FAQ preview
- `SignUp.jsx` — Registration form (full name, email, phone, timezone, T&C acceptance)
- `Donor.jsx` — Donation information page
- `FAQ.jsx` — Expandable accordion with detailed FAQs

**Styling:**
- Tailwind CSS v4.3 with PostCSS
- IBM Plex Sans font from Google Fonts
- Mobile-first responsive design
- Color scheme: primary-100 (accent), neutral grays

### Technology Stack (Web)
- **React 19** — UI framework
- **Vite 8** — Build tool and dev server
- **Tailwind CSS 4.3** — Utility-first styling
- **ESLint 10** — Linting with React plugins
- **Playwright 1.60** — Browser automation for E2E testing

### Backend (Planned, Not Yet Implemented)
See `DoingOK_Architecture.md` for full design. Planned tech:
- **Node.js + Fastify** — REST API
- **Prisma** — ORM with type safety
- **PostgreSQL** — Relational database
- **pg-boss** — Job scheduling (runs in Postgres, no extra infra)
- **GoAlert integration** — Alert escalation via Generic API
- **JWT** — Stateless auth with refresh token rotation
- **Modules:** `auth`, `users`, `contacts`, `checkins`, `alerts`, `notifications`, `metrics`

## Key Project Constraints & Decisions

### Accessibility is Critical
- Target user population includes seniors and people with disabilities
- Font size toggle (A / A+ / A++) is a must-have, not a nice-to-have
- Use high-contrast colors, readable fonts (IBM Plex Sans), semantic HTML
- Test mobile usability heavily

### Nonprofit Context
- Cost-conscious hosting (Fly.io or Render preferred)
- No external payment processing yet (donation page TBD)
- Open-source-friendly architecture (GoAlert is open-source)

### Database Design Principles
- All tables use UUID primary keys (not sequential IDs) to prevent enumeration attacks
- `created_at`, `updated_at` on every table
- Soft deletes (`deleted_at`) for sensitive data, not hard deletes
- Immutable audit trails (e.g., `tos_acceptances` never updated)

### Escalation Policy
- GoAlert creates one **Service** per registered user
- Escalation policy steps = user's trusted contacts in priority order
- Dedup key format: `user-{user_id}-checkin-{checkin_event_id}` prevents duplicate alerts

## Repository Layout

```
DoingOK/
├── DoingOK_Architecture.md     ← Start here for system design
├── web/                         ← React frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── eslint.config.js
│   ├── verify.js                ← Playwright E2E test script
│   ├── src/
│   │   ├── App.jsx              ← Main SPA with routing
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/          ← Page components
│   │   │   ├── Navigation.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── Donor.jsx
│   │   │   └── FAQ.jsx
│   │   └── assets/
│   ├── public/
│   ├── dist/                    ← Built output (after npm run build)
│   └── node_modules/
├── alpha/                        ← POC artifacts (ignore for now)
└── .claude/                      ← Claude Code settings
    └── settings.local.json
```

## Important Files to Know

- **`DoingOK_Architecture.md`** — System design, database schema, API endpoints, GoAlert integration. Read this first.
- **`web/verify.js`** — Playwright test suite that validates the landing page, forms, responsiveness, and features.
- **`web/tailwind.config.js`** — Tailwind customization (colors, fonts, breakpoints).
- **`web/src/App.jsx`** — Entry point: manages routing (SPA) and fontSize state.

## Common Tasks

### Adding a New Page/Component
1. Create a new component in `src/components/NewPage.jsx`
2. Import it in `App.jsx`
3. Add a case to the `renderSection()` switch statement
4. Update `Navigation.jsx` to add a link (if needed)

### Styling Changes
- Use Tailwind utility classes in JSX
- If custom colors/sizes needed, edit `tailwind.config.js`
- Test responsive design: dev tools → mobile viewport, or `npm run preview` + F12

### Updating Verification Tests
- Edit `verify.js` to add/modify test steps
- Run `node verify.js` to validate changes
- Commit updated `VERIFICATION_REPORT.md` as you pass new steps

### Preparing for Backend Integration
- The `SignUp.jsx` form (and others) will eventually POST to API endpoints
- Form state should be ready for conversion to API calls (not yet implemented)
- See `DoingOK_Architecture.md` section 5 (API Design) for endpoint specs

## Accessibility & Inclusive Design

The app targets vulnerable populations. Keep in mind:
- **Font size toggle** works via CSS `data-font-size` attribute on root `div`
- **Semantic HTML** — use `<details>`/`<summary>` for accordions, proper `<form>` structures
- **Color contrast** — verify WCAG AA compliance (especially navbar on colored backgrounds)
- **Mobile first** — design for 375px width first, scale up
- **Timezone support** — users span many timezones; store in UTC, display in user's local TZ

## Running Locally

```bash
cd web
npm install                 # One-time setup
npm run dev                 # Start dev server
# Open http://localhost:5173 in browser

# In another terminal, run verification:
npm run lint
node verify.js

# To build for production:
npm run build
npm run preview
```

## Database Schema (Reference)

See `DoingOK_Architecture.md` section 4 for full ERD. Key tables:
- `users` — Registered users with email, password, timezone, GoAlert service key
- `trusted_contacts` — Priority-ordered contacts per user
- `checkin_schedules` — When user expects to check in (frequency, window)
- `checkin_events` — Every check-in prompt sent (status: pending/completed/missed/late/skipped)
- `alert_events` — Every wellness alert triggered (linked to GoAlert dedup key)
- `push_tokens` — Device tokens for APNs (iOS) / FCM (Android)
- `tos_acceptances` — Immutable audit trail of T&C acceptance (IP, version, timestamp)

## Next Steps for Contributors

1. **Understand the mission** — Read the first few sections of `DoingOK_Architecture.md`
2. **Run locally** — `npm run dev` in `web/`, then verify with `node verify.js`
3. **Accessibility first** — When adding UI, test font sizes, mobile view, color contrast
4. **Database-aware** — Keep schema constraints in mind (UUIDs, soft deletes, timestamps)
5. **GoAlert integration** — Check how alerts will escalate when implementing backend

## Questions or Issues?

- Architecture questions → `DoingOK_Architecture.md` (section 9: Open Questions)
- Frontend issues → check `verify.js` and `VERIFICATION_REPORT.md`
- Database design → see schema in Architecture doc
