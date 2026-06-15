# ADR 001: Use GoAlert for Alert Escalation

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** DoingOK founding team

---

## Context

DoingOK requires a reliable, multi-step alert escalation system. When a user misses a check-in, the system must:

1. Notify a trusted contact (e.g. family member) via SMS, voice, or email
2. If unacknowledged, escalate to the next contact in priority order
3. Continue escalating until someone acknowledges or a limit is reached
4. Allow the alert to be closed programmatically when the user checks in late

We evaluated building this capability in-house vs. adopting an existing platform.

---

## Decision

We will use **GoAlert** (self-hosted) as the alert escalation engine, integrated via its Generic API.

---

## Alternatives Considered

| Option | Notes |
|---|---|
| **Build in-house** | Full control, but significant engineering effort to handle SMS, voice, retry logic, scheduling, and acknowledgment tracking reliably |
| **PagerDuty** | Mature SaaS product, but cost-prohibitive for a nonprofit at scale (per-user pricing) |
| **OpsGenie** | Similar concerns to PagerDuty — cost and vendor lock-in |
| **Twilio (direct)** | Would require building escalation logic ourselves on top of a notification primitive |
| **GoAlert (self-hosted)** | Open-source, Apache 2.0 licensed, purpose-built for escalation, supports SMS/voice/email, simple Generic API |

---

## Rationale

- **Cost:** GoAlert is free and open-source. Hosting costs are infrastructure only.
- **Fit:** Escalation policies, steps, wait times, and acknowledgment are exactly what GoAlert is designed for — we are not adapting a general tool.
- **API simplicity:** A single POST to `/api/v2/generic/incoming` triggers an alert; `action=close` resolves it. The integration is minimal.
- **Deduplication:** GoAlert's `dedup` parameter prevents duplicate alerts for the same missed check-in event.
- **Nonprofit alignment:** GoAlert is developed by Target and open-sourced; it has active maintenance and community support.

---

## Consequences

**Positive:**
- No per-notification cost
- Full control over data (self-hosted)
- Escalation logic is externalized and well-tested

**Negative / Risks:**
- We are responsible for hosting, uptime, and upgrades of the GoAlert instance
- Programmatic creation of per-user services and escalation policies requires GoAlert's GraphQL API, which is less documented than the Generic API
- If GoAlert goes unmaintained, we would need to migrate

---

## Implementation Notes

- Each DoingOK user gets their own GoAlert **Service** and **Escalation Policy**, created at registration
- The integration key is stored in `users.goalert_service_key`
- Alert dedup key format: `user-{user_id}-checkin-{checkin_event_id}`
- GoAlert is deployed alongside the API (same Fly.io organization or VM)

See: [infra/goalert/](../infra/goalert/) for configuration templates.
