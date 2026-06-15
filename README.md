# DoingOK

> Protecting vulnerable individuals through proactive wellness monitoring.

DoingOK is a nonprofit mobile app that prompts daily wellness check-ins for seniors, disabled individuals, and people with mental health concerns. If a user doesn't respond within a set window, a wellness alert is automatically escalated through their trusted contact chain.

---

## Project Structure

```
doingok/
├── apps/
│   ├── api/          # Node.js / Fastify REST API
│   ├── mobile/       # React Native mobile app (iOS + Android)
│   └── web/          # Landing page and donor portal
├── packages/
│   └── shared/       # Shared TypeScript types, constants, validation schemas
├── infra/
│   ├── goalert/      # GoAlert escalation policy templates and config
│   ├── docker/       # Dockerfiles and docker-compose for local development
│   └── migrations/   # PostgreSQL database migrations
├── docs/
│   ├── architecture.md   # System architecture reference
│   ├── api.md            # API endpoint documentation
│   ├── adr/              # Architecture Decision Records
│   └── onboarding.md     # Developer environment setup guide
└── .github/
    ├── workflows/         # CI/CD pipelines
    └── ISSUE_TEMPLATE/    # Bug and feature request templates
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker (optional, for local GoAlert)

### 1. Clone the repository

```bash
git clone https://github.com/doingok/doingok.git
cd doingok
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your local values
```

### 3. Set up the database

```bash
cd infra/migrations
# Run migrations (instructions in docs/onboarding.md)
```

### 4. Start the API

```bash
cd apps/api
npm install
npm run dev
```

See [docs/onboarding.md](docs/onboarding.md) for full setup instructions.

---

## Technology Stack

| Layer | Technology |
|---|---|
| API | Node.js + Fastify |
| Database | PostgreSQL + Prisma |
| Mobile | React Native |
| Web | (TBD) |
| Job Scheduling | pg-boss |
| Alert Escalation | GoAlert (self-hosted) |
| Auth | JWT + refresh tokens |

Full architecture documentation: [docs/architecture.md](docs/architecture.md)

---

## Contributing

We welcome contributions from developers, designers, and anyone who shares our mission. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

- Website: [doingok.org](https://doingok.org)
- Email: tech@doingok.org
- Issues: [GitHub Issues](https://github.com/doingok/doingok/issues)
