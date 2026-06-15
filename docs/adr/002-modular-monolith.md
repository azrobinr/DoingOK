# ADR 002: Modular Monolith over Microservices

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** DoingOK founding team

---

## Context

DoingOK's backend needs to handle authentication, check-in scheduling, alert triggering, push notifications, and metrics. We needed to decide whether to build these as separate microservices or as a single application.

---

## Decision

We will build a **modular monolith** — a single deployable Node.js application with clearly separated internal modules.

---

## Rationale

- **Operational simplicity:** A nonprofit engineering team (likely small, partly volunteer) should not spend time managing inter-service networking, versioning, and deployment coordination
- **Early stage:** The domain boundaries are not yet proven in production — premature extraction risks building the wrong seams
- **Developer experience:** A single codebase is easier to onboard new contributors to
- **Shared database:** All modules share one PostgreSQL instance — no distributed transaction complexity
- **Extractable later:** Clean module boundaries today make future extraction possible if specific scaling needs emerge

---

## Module Boundaries

```
src/
  auth/           JWT, sessions, password hashing
  users/          Profile, TOS acceptance
  contacts/       Trusted contacts per user
  checkins/       Schedule config, check-in event recording
  alerts/         GoAlert API integration, alert state
  notifications/  Push notification delivery
  metrics/        Aggregated reporting
```

Modules communicate via direct function calls, not HTTP. Each module owns its own database queries.

---

## Consequences

**Positive:**
- One deploy target
- Shared TypeScript types across modules
- Simple local development setup

**Negative / Risks:**
- A bug in one module can affect the whole process — good testing and error boundaries are essential
- If the `alerts` or `notifications` module needs independent scaling in the future, extraction will require effort

---

## Review Trigger

Revisit this decision if:
- The check-in job processing creates noticeable latency for API requests
- Any single module's deployment needs differ significantly from others
- The team grows large enough that separate module ownership becomes valuable
