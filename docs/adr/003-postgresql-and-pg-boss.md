# ADR 003: PostgreSQL as Primary Database and pg-boss for Job Scheduling

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** DoingOK founding team

---

## Context

DoingOK requires both a primary data store and a reliable job scheduler for time-driven tasks (missed check-in detection, push notification delivery, metrics refresh). We needed to choose these components.

---

## Decision

We will use **PostgreSQL 15+** as the primary database and **pg-boss** as the job scheduling layer, running entirely within PostgreSQL.

---

## Rationale

### PostgreSQL
- Structured, relational data (users, contacts, check-in events, alert records) benefits from relational integrity and foreign key constraints
- Strong support for audit patterns (`created_at`, `deleted_at`, immutable records)
- `INET` type for IP address storage (used in TOS acceptance and auth logging)
- Materialized views for metrics aggregation without a separate analytics database
- UUID support via `gen_random_uuid()`
- Widely understood, easy to hire and volunteer for

### pg-boss
- Runs entirely inside PostgreSQL — **no Redis or separate message broker required**
- Reduces infrastructure footprint, which matters for a nonprofit's operational overhead
- Supports delayed jobs, scheduled crons, retries, and concurrency control
- Transactional job creation — a missed check-in detection and alert record insertion can be wrapped in the same database transaction
- Sufficient for DoingOK's scale (thousands of users, not millions)

---

## Alternatives Considered

| Option | Notes |
|---|---|
| **MongoDB** | Schema flexibility not needed; relational integrity is an asset here |
| **Redis + BullMQ** | Excellent job queue, but adds Redis as a required infrastructure component |
| **node-cron** | Simple, but no persistence — jobs lost on restart, no retry logic |
| **Temporal** | Powerful workflow engine, significant operational complexity for MVP |

---

## Consequences

**Positive:**
- Single infrastructure component (PostgreSQL) handles both data and jobs
- Transactional job enqueueing prevents lost work
- Prisma handles migrations and type-safe queries

**Negative / Risks:**
- At very high scale (100k+ active users), pg-boss polling may create database load — monitor and tune poll intervals
- pg-boss stores job history in the database — implement a regular cleanup job to prevent table bloat
