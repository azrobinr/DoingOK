# GoAlert Configuration

This directory contains configuration templates and documentation for DoingOK's GoAlert instance.

GoAlert handles all alert escalation — when a user misses a check-in, the DoingOK API triggers an alert here, and GoAlert notifies trusted contacts in priority order via SMS, voice, or email.

---

## Local Development

Run GoAlert locally via Docker:

```bash
docker run -it --rm -p 8081:8081 goalert/all-in-one-demo
```

Available at [http://localhost:8081](http://localhost:8081)
Credentials: `admin` / `admin123`

---

## Per-User Setup (Automated at Registration)

When a new DoingOK user registers, the API programmatically creates the following in GoAlert via its GraphQL API:

1. **Service** — one per user, named `doingok-user-{userId}`
2. **Integration Key** — Generic API type; stored in `users.goalert_service_key`
3. **Escalation Policy** — one per user, named `doingok-policy-{userId}`
4. **Escalation Steps** — one step per trusted contact, in `priority_order`

### Escalation Step Defaults

| Setting | Default Value |
|---|---|
| Wait time per step | 15 minutes |
| Repeat limit | 2 (cycles through all steps twice before expiring) |
| Notification methods | Per contact preferences (SMS, voice, email) |

---

## Alert API Usage

### Trigger a wellness alert

```bash
curl -XPOST "https://goalert.doingok.org/api/v2/generic/incoming" \
  -d "token=USER_INTEGRATION_KEY" \
  -d "summary=Wellness check needed: Margaret H. has not checked in" \
  -d "details=Scheduled check-in was missed. Last response: 2026-05-30 09:00 UTC." \
  -d "dedup=user-{userId}-checkin-{checkinEventId}"
```

### Close an alert (user checked in late)

```bash
curl -XPOST "https://goalert.doingok.org/api/v2/generic/incoming" \
  -d "token=USER_INTEGRATION_KEY" \
  -d "summary=Wellness check needed: Margaret H. has not checked in" \
  -d "action=close" \
  -d "dedup=user-{userId}-checkin-{checkinEventId}"
```

---

## Files in This Directory

| File | Purpose |
|---|---|
| `escalation-policy-template.json` | Template for programmatic policy creation via GraphQL |
| `docker-compose.yml` | GoAlert + PostgreSQL for local development |

---

## Production Deployment

GoAlert should be deployed on a separate process from the main API, but can share the same hosting platform (e.g. Fly.io). It requires its own PostgreSQL database.

See GoAlert's official docs: [https://goalert.me/docs](https://goalert.me/docs)
