# DoingOK — Technical Architecture & Project Reference

**Organization:** DoingOK (Nonprofit)
**Mission:** Protect the well-being of vulnerable individuals — seniors, disabled individuals, and people with mental health concerns — through proactive daily wellness monitoring and automated alert escalation.
**Document Status:** Living document — updated as architecture decisions are made.
**Last Updated:** May 30, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [Alert Escalation — GoAlert Integration](#6-alert-escalation--goalert-integration)
7. [Background Job System](#7-background-job-system)
8. [Mobile App](#8-mobile-app)
9. [Open Questions & Decisions](#9-open-questions--decisions)
10. [Glossary](#10-glossary)

---

## 1. Project Overview

DoingOK is a mobile app that prompts registered users for daily wellness check-ins. If a user fails to respond within a configured time window, the system automatically escalates a wellness alert through a prioritized contact chain — trusted contacts first, then community volunteers, then local authorities if needed.

### Core User Flows

1. **User registers** → sets up profile, accepts terms, configures check-in schedule, adds trusted contacts
2. **Daily check-in prompt** → user taps to confirm they are OK
3. **Missed check-in** → backend detects no response within window → triggers GoAlert escalation
4. **Late check-in** → user responds after window → system auto-resolves open alert in GoAlert
5. **Contact acknowledges** → alert is closed manually or via GoAlert acknowledgment

---

## 2. System Architecture

### High-Level Diagram

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Mobile App        │◄──────►│   Node.js REST API        │
│  (iOS / Android)    │  HTTPS │  (Modular Monolith)       │
└─────────────────────┘        └────────────┬─────────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                   ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
                   │ PostgreSQL  │  │  pg-boss      │  │  GoAlert    │
                   │  Database   │  │  Job Queue    │  │  (Self-host)│
                   └─────────────┘  └──────────────┘  └─────────────┘
```

### Architecture Pattern: Modular Monolith

The system is implemented as a single deployable Node.js application with clearly separated internal modules. This avoids the operational overhead of microservices while maintaining clean separation of concerns. Modules can be extracted into independent services later if specific scaling needs arise.

#### Internal Modules

| Module | Responsibility |
|---|---|
| `auth` | JWT issuance, refresh tokens, password hashing |
| `users` | Profile management, TOS acceptance |
| `contacts` | Trusted contact management per user |
| `checkins` | Schedule configuration, check-in event recording |
| `alerts` | GoAlert API integration, alert state tracking |
| `notifications` | Push notifications to mobile (APNs / FCM) |
| `metrics` | Aggregated reporting, health dashboards |

---

## 3. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| API Runtime | Node.js + Fastify | Fast, lightweight, good TypeScript support |
| Database | PostgreSQL | Relational integrity, strong JSON support, audit trails |
| ORM / Query Builder | Prisma | Type-safe schema, migrations, excellent DX |
| Auth | JWT + refresh tokens | Stateless, mobile-friendly |
| Password Hashing | bcrypt | Industry standard |
| Job Scheduling | pg-boss | Runs entirely in Postgres — no extra infrastructure |
| Alert Escalation | GoAlert (self-hosted) | Open-source, on-call scheduling, SMS/voice/email |
| Push Notifications | FCM (Android) + APNs (iOS) | Native mobile push |
| Hosting | Fly.io or Render | Nonprofit-friendly pricing, simple deploys |
| CI/CD | GitHub Actions | Free for open-source/nonprofits |

---

## 4. Database Schema

### Design Principles

- All tables use UUID primary keys (not sequential integers) to avoid enumeration attacks
- `created_at` and `updated_at` on every table
- Soft deletes (`deleted_at`) on sensitive tables rather than hard deletes
- TOS acceptance stored immutably with IP and version for legal compliance
- Alert events preserved even after resolution for audit and metrics

---

### 4.1 `users`

Stores authenticated user accounts.

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT,                          -- E.164 format e.g. +16025550101
  password_hash     TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  display_name      TEXT,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  goalert_service_key TEXT,                        -- Integration key from GoAlert service
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                    -- Soft delete
);

CREATE INDEX idx_users_email ON users(email);
```

**Notes:**
- `goalert_service_key` is created programmatically in GoAlert when a user registers and stores the integration key for that user's personal GoAlert service.
- `phone` stored in E.164 format for GoAlert SMS compatibility.

---

### 4.2 `tos_acceptances`

Immutable record of every time a user accepts a Terms of Service version. Never updated or deleted.

```sql
CREATE TABLE tos_acceptances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,                 -- e.g. "2026-05-30", "v1.2"
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   INET NOT NULL,                 -- Stored for legal compliance
  user_agent   TEXT,
  UNIQUE (user_id, version)                   -- One acceptance per version per user
);

CREATE INDEX idx_tos_user_id ON tos_acceptances(user_id);
```

**Notes:**
- Records are never updated. If a user re-accepts the same version, upsert is blocked by the unique constraint.
- Current TOS version should be stored in application config, not the database.

---

### 4.3 `refresh_tokens`

Tracks issued refresh tokens for JWT rotation and revocation.

```sql
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,          -- bcrypt hash of the token
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  device_name  TEXT,                          -- e.g. "iPhone 15 Pro"
  ip_address   INET
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

### 4.4 `trusted_contacts`

The prioritized chain of people to notify when a user misses a check-in.

```sql
CREATE TABLE trusted_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  relationship   TEXT,                        -- e.g. "Daughter", "Neighbor", "Volunteer"
  phone          TEXT,                        -- E.164 format
  email          TEXT,
  priority_order INTEGER NOT NULL DEFAULT 1,  -- 1 = first notified, 2 = second, etc.
  notify_via_sms   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_via_email BOOLEAN NOT NULL DEFAULT FALSE,
  notify_via_call  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, priority_order)
);

CREATE INDEX idx_contacts_user_id ON trusted_contacts(user_id);
```

**Notes:**
- GoAlert escalation policy steps map to `priority_order`. Step 1 = priority 1, etc.
- At least one of `phone` or `email` must be present (enforced at application layer).

---

### 4.5 `checkin_schedules`

Defines how frequently a user expects to check in and the response window.

```sql
CREATE TABLE checkin_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  frequency       TEXT NOT NULL DEFAULT 'daily',    -- 'daily', 'twice_daily', 'weekly'
  scheduled_hour  INTEGER NOT NULL DEFAULT 9,        -- Hour of day (0-23) in user's timezone
  window_minutes  INTEGER NOT NULL DEFAULT 120,      -- Minutes after prompt before alert fires
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `window_minutes` is the grace period: if set to 120, GoAlert is triggered 2 hours after the scheduled check-in if no response is received.
- `scheduled_hour` is interpreted in the user's `timezone` from the `users` table.

---

### 4.6 `checkin_events`

A record of every check-in prompt sent and its outcome.

```sql
CREATE TYPE checkin_status AS ENUM (
  'pending',     -- Prompt sent, awaiting response
  'completed',   -- User responded within window
  'missed',      -- No response within window — alert triggered
  'late',        -- User responded after window (alert was already triggered)
  'skipped'      -- User proactively marked as unavailable (planned absence)
);

CREATE TABLE checkin_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,        -- When the check-in was due
  prompted_at     TIMESTAMPTZ,                 -- When push notification was sent
  responded_at    TIMESTAMPTZ,                 -- When user tapped OK (null if missed)
  status          checkin_status NOT NULL DEFAULT 'pending',
  notes           TEXT,                        -- Optional user-entered notes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkin_events_user_id ON checkin_events(user_id);
CREATE INDEX idx_checkin_events_status ON checkin_events(status);
CREATE INDEX idx_checkin_events_scheduled_at ON checkin_events(scheduled_at);
```

---

### 4.7 `alert_events`

Tracks every wellness alert triggered, its escalation state, and resolution.

```sql
CREATE TYPE alert_status AS ENUM (
  'triggered',    -- Alert sent to GoAlert, awaiting acknowledgment
  'acknowledged', -- A contact acknowledged via GoAlert
  'resolved',     -- Alert closed (user checked in late, or contact confirmed safe)
  'expired'       -- No one acknowledged before repeat limit reached
);

CREATE TABLE alert_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_event_id      UUID REFERENCES checkin_events(id),
  goalert_dedup_key     TEXT NOT NULL UNIQUE,   -- Dedup key sent to GoAlert API
  status                alert_status NOT NULL DEFAULT 'triggered',
  escalation_step       INTEGER,                -- Which step was active when resolved
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at       TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  resolved_by           TEXT,                   -- Name/identifier of who resolved
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_events_user_id ON alert_events(user_id);
CREATE INDEX idx_alert_events_status ON alert_events(status);
```

**Notes:**
- `goalert_dedup_key` prevents duplicate alerts for the same missed check-in event. Format: `user-{user_id}-checkin-{checkin_event_id}`.
- When a user checks in late, the backend calls GoAlert's close action and sets `status = 'resolved'` here.

---

### 4.8 `push_tokens`

Stores device push notification tokens per user.

```sql
CREATE TABLE push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,               -- 'ios' or 'android'
  token        TEXT NOT NULL UNIQUE,
  device_name  TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
```

---

### 4.9 `metrics` (Materialized View)

Rather than a separate table, key metrics are derived from existing tables via a materialized view, refreshed periodically.

```sql
CREATE MATERIALIZED VIEW user_metrics AS
SELECT
  u.id                                                        AS user_id,
  COUNT(ce.id) FILTER (WHERE ce.status = 'completed')        AS total_checkins_completed,
  COUNT(ce.id) FILTER (WHERE ce.status = 'missed')           AS total_checkins_missed,
  COUNT(ce.id) FILTER (WHERE ce.status = 'late')             AS total_checkins_late,
  COUNT(ae.id)                                               AS total_alerts_triggered,
  COUNT(ae.id) FILTER (WHERE ae.status = 'resolved')         AS total_alerts_resolved,
  MAX(ce.responded_at) FILTER (WHERE ce.status = 'completed') AS last_checkin_at,
  ROUND(
    100.0 * COUNT(ce.id) FILTER (WHERE ce.status = 'completed')
    / NULLIF(COUNT(ce.id) FILTER (WHERE ce.status IN ('completed','missed','late')), 0)
  , 1)                                                        AS checkin_compliance_pct
FROM users u
LEFT JOIN checkin_events ce ON ce.user_id = u.id
LEFT JOIN alert_events ae ON ae.user_id = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- Refresh on a schedule (via pg-boss job, e.g. every hour)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY user_metrics;
```

---

### Schema Entity Relationship Summary

```
users
  ├── tos_acceptances        (one user → many acceptances)
  ├── refresh_tokens         (one user → many tokens)
  ├── trusted_contacts       (one user → ordered list of contacts)
  ├── checkin_schedules      (one user → one active schedule)
  ├── checkin_events         (one user → many events over time)
  ├── alert_events           (one user → many alerts, linked to checkin_events)
  └── push_tokens            (one user → one or more devices)
```

---

## 5. API Design

### Base URL
`https://api.doingok.org/v1`

### Authentication
All protected routes require `Authorization: Bearer <access_token>` header. Access tokens expire in 15 minutes. Refresh tokens expire in 30 days and are rotated on each use.

### Key Endpoints (Planned)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET` | `/users/me` | Get own profile |
| `PATCH` | `/users/me` | Update profile |
| `POST` | `/users/me/tos` | Record TOS acceptance |
| `GET` | `/contacts` | List trusted contacts |
| `POST` | `/contacts` | Add trusted contact |
| `PATCH` | `/contacts/:id` | Update contact |
| `DELETE` | `/contacts/:id` | Remove contact |
| `GET` | `/checkins/schedule` | Get current schedule |
| `PUT` | `/checkins/schedule` | Update schedule |
| `POST` | `/checkins/respond` | Submit a check-in response |
| `GET` | `/checkins/history` | Paginated check-in history |
| `GET` | `/alerts` | List alert events |
| `POST` | `/alerts/:id/resolve` | Manually resolve an alert |
| `GET` | `/metrics/me` | Get personal metrics summary |

---

## 6. Alert Escalation — GoAlert Integration

### Overview

GoAlert is a self-hosted, open-source on-call and escalation platform. DoingOK uses GoAlert's Generic API to trigger wellness alerts when users miss a check-in.

### GoAlert Concepts Mapped to DoingOK

| GoAlert Concept | DoingOK Usage |
|---|---|
| **Service** | One per registered user; created programmatically at registration |
| **Integration Key** | Stored in `users.goalert_service_key`; used to send alerts |
| **Escalation Policy** | One per user; steps = trusted contacts in `priority_order` |
| **Step** | Each trusted contact; wait time = configurable (default 15 min) |
| **Alert** | Created when check-in window expires; closed when user responds late |

### Triggering an Alert

When `pg-boss` detects a missed check-in, the `alerts` module fires:

```http
POST https://goalert.doingok.org/api/v2/generic/incoming
Content-Type: application/x-www-form-urlencoded

token=<users.goalert_service_key>
&summary=Wellness check needed: {user.display_name} has not checked in
&details=Last scheduled check-in: {scheduled_at}. Please contact them to confirm they are safe.
&dedup=user-{user_id}-checkin-{checkin_event_id}
```

### Closing an Alert (Late Check-In)

```http
POST https://goalert.doingok.org/api/v2/generic/incoming

token=<users.goalert_service_key>
&summary=Wellness check needed: {user.display_name} has not checked in
&action=close
&dedup=user-{user_id}-checkin-{checkin_event_id}
```

### GoAlert Setup Per New User (Registration Flow)

1. Create a GoAlert **Service** via GraphQL API
2. Create an **Integration Key** on that service → store in `users.goalert_service_key`
3. Create an **Escalation Policy** with one step per trusted contact
4. Attach the escalation policy to the service

> **Note:** When a user updates their trusted contacts, the corresponding GoAlert escalation policy steps must be kept in sync.

---

## 7. Background Job System

### Tool: pg-boss

pg-boss manages all time-driven background work using PostgreSQL as its queue backend. No additional infrastructure (Redis, etc.) is required.

### Scheduled Jobs

| Job | Trigger | Action |
|---|---|---|
| `schedule-checkin-prompts` | Daily cron | Create `checkin_events` records and enqueue prompt delivery for each active user |
| `send-checkin-push` | Per event | Send push notification to user's registered device(s) |
| `detect-missed-checkins` | Every 5 min | Query `checkin_events` where `status = 'pending'` and `scheduled_at + window_minutes < NOW()` → trigger GoAlert |
| `refresh-metrics-view` | Every hour | `REFRESH MATERIALIZED VIEW CONCURRENTLY user_metrics` |
| `expire-refresh-tokens` | Daily | Delete or mark expired refresh tokens |

### Missed Check-In Detection Logic

```
FOR each checkin_event WHERE status = 'pending'
  AND scheduled_at + (window_minutes * interval '1 minute') < NOW()
  AND no open alert_event exists for this checkin_event:

  1. Insert alert_event (status = 'triggered')
  2. Update checkin_event status = 'missed'
  3. POST to GoAlert Generic API with dedup key
```

---

## 8. Mobile App

*To be defined. Planned sections:*

- Platform (React Native / Flutter / native iOS+Android)
- Check-in UX flow
- Push notification handling
- Offline / low-connectivity behavior
- Accessibility requirements (critical given user population)

---

## 9. Open Questions & Decisions

| # | Question | Status |
|---|---|---|
| 1 | Self-host GoAlert on Fly.io alongside API, or separate VM? | Open |
| 2 | Mobile platform: React Native vs Flutter vs native? | Open |
| 3 | Should trusted contacts receive a DoingOK app invite, or just SMS/email? | Open |
| 4 | What is the repeat limit on GoAlert escalation before escalating to local authorities? | Open |
| 5 | How should "planned absence" (user traveling, medical stay) be handled to suppress alerts? | Open |
| 6 | HIPAA considerations: does storing wellness check data require BAAs with hosting providers? | Open |
| 7 | Should community volunteers be managed within DoingOK or within GoAlert? | Open |
| 8 | What version of TOS should be shipped at launch, and who owns drafting it? | Open |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Check-in** | A user's daily confirmation that they are OK, submitted via the mobile app |
| **Check-in window** | The grace period after a scheduled check-in time before an alert is triggered |
| **Trusted contact** | A person designated by the user to be notified if they miss a check-in |
| **Alert escalation** | The process of notifying contacts in priority order until one acknowledges |
| **GoAlert** | Open-source on-call scheduling and escalation platform used by DoingOK |
| **Dedup key** | A unique string sent with each GoAlert API call to prevent duplicate alerts |
| **pg-boss** | PostgreSQL-backed job scheduling library used for background tasks |
| **TOS** | Terms of Service — legal agreement users must accept before using the app |
| **Soft delete** | Marking a record as deleted via a `deleted_at` timestamp rather than removing it from the database |

---

*This document is maintained as part of the DoingOK technical project. Sections will be expanded as decisions are made and implementation progresses.*
