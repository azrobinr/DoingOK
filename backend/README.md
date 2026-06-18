# DoingOK API Backend

Node.js + Fastify REST API for the DoingOK wellness monitoring platform.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)

### Setup

1. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   ```

4. **Create database and tables**
   ```bash
   npm run prisma:migrate
   ```

5. **Start dev server**
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:3000`

## Available Commands

- `npm run dev` — Start dev server with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled server
- `npm run prisma:migrate` — Create/apply database migrations
- `npm run prisma:studio` — Open Prisma Studio (web UI for database)
- `npm run lint` — Run ESLint
- `npm test` — Run tests

## Project Structure

```
backend/
├── src/
│   ├── modules/          — Feature modules (auth, users, contacts, etc.)
│   ├── utils/            — Shared utilities
│   └── index.ts          — Entry point
├── prisma/
│   └── schema.prisma     — Database schema
├── docker-compose.yml    — PostgreSQL setup
├── package.json
└── tsconfig.json
```

## Database

PostgreSQL 16 runs in Docker. Connection details:
- Host: `localhost`
- Port: `5432`
- User: `doingok`
- Password: `doingok`
- Database: `doingok`

View/edit data via Prisma Studio:
```bash
npm run prisma:studio
```

## Architecture

See `../DoingOK_Architecture.md` for:
- Complete API endpoint specs
- Database schema design
- GoAlert integration details
- Background job system (pg-boss)
- Authentication flow
