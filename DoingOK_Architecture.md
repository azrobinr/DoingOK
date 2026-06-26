# DoingOK — Technical Architecture & Project Reference

**Organization:** DoingOK (Nonprofit)
**Mission:** Protect the well-being of vulnerable individuals — seniors, disabled individuals, and people with mental health concerns — through proactive daily wellness monitoring and automated alert escalation.
**Document Status:** Living document — updated as architecture decisions are made.
**Last Updated:** June 26, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [Alert Escalation](#6-alert-escalation)
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
3. **Missed check-in** → backend detects no response within window → creates alert, begins notifying trusted contacts via SMS in priority order
4. **Late check-in** → user responds after window → alert resolved, escalation stops
5. **Contact acknowledges** → alert can be manually resolved via API

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
                   │ PostgreSQL  │  │  pg-boss      │  │  Twilio     │
                   │  Database   │  │  Job Queue    │  │  SMS API    │
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
| `alerts` | Alert state tracking, own escalation loop |
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
| Alert Escalation | Own escalation loop + Twilio SMS | Full control over escalation logic; no external on-call platform dependency |
| Push Notifications | FCM (Android) + APNs (iOS) via Expo | Native mobile push |
| Hosting | Fly.io or Render | Nonprofit-friendly pricing, simple deploys |
| CI/CD | GitHub Actions | Free for open-source/nonprofits |

---

## 4. Database Schema

### Design Principles

- All tables use UUID primary keys (not sequential integers) to avoid enumeration attacks
- `created_at` and `updated_at` on every table
- Soft deletes (`deleted_at`) on sensitive tables rather than hard deletes
- TOS acceptance stored immutably with IP and version for legal compliance
- Alert events and escalation contact records preserved after resolution for audit and metrics

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
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                    -- Soft delete
);

CREATE INDEX idx_users_email ON users(email);
```

**Notes:**
- `phone` stored in E.164 format for SMS compatibility.

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
- `priority_order` determines escalation sequence: step 1 is notified first, then step 2 after the configured delay, etc.
- At least one of `phone` or `email` must be present (enforced at application layer).
- SMS is the currently active notification channel; `notify_via_email` and `notify_via_call` are schema-ready but not yet wired to providers.

---

### 4.5 `checkin_schedules`

Defines how frequently a user expects to check in, the response window, and the delay between escalation steps.

```sql
CREATE TABLE checkin_schedules (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  frequency                 TEXT NOT NULL DEFAULT 'daily',   -- 'daily', 'twice_daily', 'weekly'
  scheduled_hour            INTEGER NOT NULL DEFAULT 9,       -- Hour of day (0-23) in user's timezone
  window_minutes            INTEGER NOT NULL DEFAULT 120,     -- Grace period before alert fires
  escalation_delay_minutes  INTEGER NOT NULL DEFAULT 15,      -- Wait time between contacting each step
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `window_minutes`: if set to 120, an alert is triggered 2 hours after the scheduled check-in with no response.
- `escalation_delay_minutes`: how long to wait before moving to the next trusted contact if the current one does not respond. Default 15 minutes.
- `scheduled_hour` is interpreted in the user's `timezone` from the `users` table.

---

### 4.6 `checkin_events`

A record of every check-in prompt sent and its outcome.

```sql
CREATE TYPE checkin_status AS ENUM (
  'pending',     -- Prompt sent, awaiting response
  'completed',   -- User responded within window
  'missed',      -- No response within window — alert triggered
  'late',        -- User responded after window (alert already triggered and now resolved)
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
  'triggered',    -- Alert created, escalation loop is active
  'acknowledged', -- A contact acknowledged (reserved for future use)
  'resolved',     -- Alert closed — user checked in late, or contact confirmed safe
  'expired'       -- All contacts exhausted with no acknowledgment
);

CREATE TABLE alert_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_event_id      UUID UNIQUE REFERENCES checkin_events(id) ON DELETE SET NULL,
  status                alert_status NOT NULL DEFAULT 'triggered',
  escalation_step       INTEGER,                -- Tracks which contact step was last attempted
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
- The `UNIQUE` constraint on `checkin_event_id` prevents duplicate alerts for the same missed check-in.
- Setting `status = 'resolved'` stops the escalation loop from sending further notifications.
- When a user checks in late, the backend sets `status = 'resolved'` and `resolution_notes = 'Late check-in'` atomically.

---

### 4.8 `escalation_contacts`

An append-only log of every contact notification attempt for a given alert. Used by the escalation loop to determine which contacts have already been reached and when.

```sql
CREATE TYPE escalation_method AS ENUM ('sms', 'call', 'email');
CREATE TYPE escalation_contact_status AS ENUM ('sent', 'delivered', 'failed');

CREATE TABLE escalation_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_event_id    UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
  trusted_contact_id UUID REFERENCES trusted_contacts(id) ON DELETE SET NULL,
                                                -- Nullable: preserved if contact is later deleted
  priority_order    INTEGER NOT NULL,
  method            escalation_method NOT NULL,
  status            escalation_contact_status NOT NULL DEFAULT 'sent',
  notified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_contacts_alert_event_id ON escalation_contacts(alert_event_id);
CREATE INDEX idx_escalation_contacts_trusted_contact_id ON escalation_contacts(trusted_contact_id);
```

**Notes:**
- Records are created **before** the SMS is sent so that a crash after sending cannot cause a duplicate notification on the next job run.
- `trusted_contact_id` uses `SET NULL` on delete so the historical record is preserved even if the contact is removed.

---

### 4.9 `push_tokens`

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

### 4.10 `metrics` (Materialized View)

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
  │     └── escalation_contacts  (one alert → one record per contact attempt)
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

## 6. Alert Escalation

### Overview

DoingOK implements its own escalation loop rather than relying on an external on-call platform. When a check-in is missed, the system creates an `alert_event` and then progressively notifies the user's trusted contacts via SMS in priority order, waiting a configurable delay between each step. This gives the project full control over escalation logic with no external service dependency beyond Twilio for SMS delivery.

### Escalation Flow

```
check-in window expires
        │
        ▼
detect-missed-checkins job (every 5 min)
  → creates alert_event (status = 'triggered')
  → marks checkin_event (status = 'missed')
        │
        ▼
escalate-alerts job (every 5 min)
  → for each alert_event WHERE status = 'triggered':
      1. Find lowest priority_order contact not yet in escalation_contacts
      2. If first contact → notify immediately
         If subsequent contact → check elapsed time >= escalation_delay_minutes
      3. Insert escalation_contacts record (before sending — idempotency guard)
      4. Send SMS via Twilio
      5. If send fails → update escalation_contacts.status = 'failed'
        │
        ▼
  (repeat every 5 min until alert resolved or all contacts exhausted)
        │
        ▼
user checks in late  ──►  closeMissedCheckin()
  → checkin_event.status = 'late'
  → alert_event.status = 'resolved'   ← escalation loop stops
```

### Idempotency

The `escalation_contacts` record is written to the database **before** the SMS is dispatched. If the process crashes after sending but before committing, the next job run sees the existing record and treats that contact as already attempted — preventing duplicate notifications.

### Notification Channels

| Channel | Status | Provider |
|---|---|---|
| SMS | Active | Twilio |
| Voice call | Planned | TBD |
| Email | Planned | TBD |

### Twilio SMS Message Format

```
DoingOK wellness alert: {user.displayName} has not completed their daily check-in.
Please reach out to confirm they are safe.
```

### Late Check-In Resolution

When a user submits a check-in after their window has already elapsed:

1. `checkin_event.status` → `'late'`, `responded_at` set
2. `alert_event.status` → `'resolved'`, `resolved_at` set, `resolution_notes = 'Late check-in'`
3. The escalation loop will not send further notifications for this alert

Both updates are applied in a single database transaction to prevent inconsistent state.

---

## 7. Background Job System

### Tool: pg-boss

pg-boss manages all time-driven background work using PostgreSQL as its queue backend. No additional infrastructure (Redis, etc.) is required.

### Scheduled Jobs

| Job | Trigger | Action |
|---|---|---|
| `schedule-checkin-prompts` | Hourly | Create `checkin_events` records and enqueue prompt delivery for each active user (idempotent per user per day) |
| `send-checkin-push` | Per event | Send push notification to user's registered device(s) |
| `detect-missed-checkins` | Every 5 min | Query `checkin_events` where `status = 'pending'` and `scheduled_at + window_minutes < NOW()` → create `alert_event`, mark check-in `missed` |
| `escalate-alerts` | Every 5 min | Walk trusted contacts for each open alert; send SMS when delay threshold is met |
| `expire-refresh-tokens` | Daily 03:00 UTC | Prune expired refresh tokens |

### Missed Check-In Detection Logic

```
FOR each checkin_event WHERE status = 'pending'
  AND scheduled_at + (window_minutes * interval '1 minute') < NOW()
  AND no alert_event exists for this checkin_event:

  BEGIN TRANSACTION
    INSERT alert_event (status = 'triggered', escalation_step = 1)
    UPDATE checkin_event SET status = 'missed'
  COMMIT
```

The `UNIQUE` constraint on `alert_events.checkin_event_id` makes this detection naturally idempotent — concurrent runs cannot create duplicate alerts for the same event.

---

## 8. Mobile App

The mobile app is built with **Expo SDK 56** (React Native 0.85 / React 19). It is structured as a native-stack navigator with the following screens:

| Screen | Description |
|---|---|
| Login | Email + password authentication |
| Register | Account creation with TOS acceptance |
| Home | Daily check-in prompt; shows pending/completed/missed state |
| Schedule | Configure check-in frequency, hour, window, and escalation delay |
| Contacts | Manage trusted contacts in priority order |
| Settings | Profile management, password change, sign out |

### Push Notifications

Expo Push Notifications are used to deliver daily check-in prompts. Device tokens are registered via `POST /users/:id/push-token` and stored in `push_tokens`. The `send-checkin-push` pg-boss job calls the Expo Push API to deliver notifications.

### Accessibility

The target user population includes seniors and people with disabilities. All screens are designed with large touch targets, high-contrast text, and semantic accessibility labels. Font size preferences are handled at the OS level via React Native's `allowFontScaling`.

---

## 9. Open Questions & Decisions

| # | Question | Status |
|---|---|---|
| 1 | Mobile platform: React Native / Expo — confirmed. EAS build pipeline needed for TestFlight / Play Store. | Decided |
| 2 | Should trusted contacts receive a DoingOK app invite, or just SMS/email? | Open |
| 3 | What is the repeat limit on escalation before flagging as `expired`? Currently contacts are exhausted with no auto-escalation to authorities. | Open |
| 4 | How should "planned absence" (user traveling, medical stay) be handled to suppress alerts? | Open |
| 5 | HIPAA considerations: does storing wellness check data require BAAs with hosting providers? | Open |
| 6 | Should community volunteers be a first-class concept in DoingOK, or are they just regular trusted contacts? | Open |
| 7 | What version of TOS should be shipped at launch, and who owns drafting it? | Open |
| 8 | Voice call and email escalation channels — which provider, and when to prioritize? | Open |
| 9 | Should contacts be able to acknowledge an alert via a reply SMS or a web link, without needing the app? | Open |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Check-in** | A user's daily confirmation that they are OK, submitted via the mobile app |
| **Check-in window** | The grace period after a scheduled check-in time before an alert is triggered |
| **Trusted contact** | A person designated by the user to be notified if they miss a check-in |
| **Alert escalation** | The process of notifying contacts in priority order until the alert is resolved |
| **Escalation delay** | The wait time between notifying one trusted contact and the next (`escalation_delay_minutes`) |
| **Escalation contact record** | An append-only log entry in `escalation_contacts` recording each notification attempt |
| **Twilio** | SMS delivery provider used to send wellness alert messages to trusted contacts |
| **pg-boss** | PostgreSQL-backed job scheduling library used for background tasks |
| **TOS** | Terms of Service — legal agreement users must accept before using the app |
| **Soft delete** | Marking a record as deleted via a `deleted_at` timestamp rather than removing it from the database |
| **Late check-in** | A check-in submitted after the window has elapsed; resolves the open alert |

---

*This document is maintained as part of the DoingOK technical project. Sections will be expanded as decisions are made and implementation progresses.*
