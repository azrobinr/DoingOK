# Developer Onboarding Guide

Welcome to DoingOK. This guide gets your local development environment running from scratch.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or `nvm` |
| PostgreSQL | 15+ | [postgresql.org](https://www.postgresql.org) or Docker |
| Docker | Latest | [docker.com](https://www.docker.com) (optional but recommended) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## 1. Clone the Repository

```bash
git clone https://github.com/doingok/doingok.git
cd doingok
```

---

## 2. Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in values. For local development, the defaults in `.env.example` work for most fields. You'll need to provide:

- A running PostgreSQL connection string (`DATABASE_URL`)
- Random secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`

Generate secrets quickly:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. Database Setup

### Option A — Docker (recommended)

```bash
docker run -d \
  --name doingok-postgres \
  -e POSTGRES_USER=doingok \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=doingok_dev \
  -p 5432:5432 \
  postgres:15
```

### Option B — Local PostgreSQL

```bash
createdb doingok_dev
createuser doingok
psql -c "ALTER USER doingok WITH PASSWORD 'password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE doingok_dev TO doingok;"
```

### Run Migrations

```bash
cd apps/api
npm install
npx prisma migrate dev
```

---

## 4. GoAlert (Local)

GoAlert handles alert escalation. For local development, run it via Docker:

```bash
docker run -it --rm -p 8081:8081 goalert/all-in-one-demo
```

GoAlert will be available at [http://localhost:8081](http://localhost:8081).
Default credentials: `admin` / `admin123`

After logging in:
1. Create a Service named `doingok-dev`
2. Create an Integration Key on that service (Generic API type)
3. Copy the key into your `.env` as a test value

See [infra/goalert/README.md](../infra/goalert/README.md) for full GoAlert configuration.

---

## 5. Start the API

```bash
cd apps/api
npm run dev
```

The API will be available at [http://localhost:3000](http://localhost:3000).

Health check: `GET http://localhost:3000/health`

---

## 6. Start the Mobile App

```bash
cd apps/mobile
npm install
npm run start
```

Follow the Expo / React Native prompts to run on a simulator or physical device.

---

## 7. Running Tests

```bash
# API tests
cd apps/api
npm test

# Mobile tests
cd apps/mobile
npm test
```

---

## Useful Commands

```bash
# Generate a new Prisma migration after schema changes
cd apps/api && npx prisma migrate dev --name describe-your-change

# Open Prisma Studio (database browser)
cd apps/api && npx prisma studio

# View pg-boss job queue (via psql)
psql $DATABASE_URL -c "SELECT * FROM pgboss.job ORDER BY createdon DESC LIMIT 20;"
```

---

## Troubleshooting

**`DATABASE_URL` connection refused**
Make sure PostgreSQL is running. If using Docker: `docker ps` to verify the container is up.

**GoAlert not reachable**
Confirm the Docker container is running and `GOALERT_BASE_URL` in `.env` matches.

**Push notifications not working locally**
FCM and APNs require real device tokens and valid credentials. In development, push notifications will log to the console instead of delivering. Set `NODE_ENV=development` to enable this fallback.

---

## Getting Help

- Read the architecture document: [docs/architecture.md](architecture.md)
- Open a [GitHub Discussion](https://github.com/doingok/doingok/discussions)
- Email: tech@doingok.org
