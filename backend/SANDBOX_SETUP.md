# Sandbox Infrastructure Setup

This guide covers three approaches to manage isolated test environments:

## Option 1: GitHub Actions (Automated CI/CD)

Automatically spins up PostgreSQL and runs tests on every push/PR.

**Already configured in**: `.github/workflows/test.yml`

**Features**:
- ✅ Automatic PostgreSQL 16 container per test run
- ✅ Auto-cleanup after tests complete
- ✅ Coverage reports uploaded to Codecov
- ✅ No manual intervention needed

**To use**:
```bash
git push origin dev  # Triggers workflow automatically
```

**View results**: GitHub Actions tab in the repository

---

## Option 2: Slack Bot for Manual Sandboxes

Deploy a Slack bot that creates on-demand test environments.

### Prerequisites

```bash
# Install Slack dependencies
npm install @slack/bolt dockerode uuid

# Set environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_SIGNING_SECRET=your-signing-secret
```

### Setup Slack App

1. Go to https://api.slack.com/apps
2. Create a new app → "From scratch"
3. Name: "DoingOK Sandbox Manager"
4. Select your workspace
5. Enable "Interactivity & Shortcuts"
6. Add Slash Commands:
   - `/sandbox-start` - Start a sandbox
   - `/sandbox-destroy` - Destroy a sandbox
   - `/sandbox-list` - List active sandboxes

7. OAuth & Permissions → Scopes:
   ```
   chat:write
   commands
   ```

8. Copy Bot Token (starts with `xoxb-`)

### Deploy Slack Handler

```bash
# Option A: Deploy to AWS Lambda
npx serverless deploy

# Option B: Run locally
npm run sandbox:handler
```

### Usage in Slack

```
/sandbox-start
# Response: Sandbox abc12345 is ready!
# API: http://localhost:3000
# DB: localhost:5432

/sandbox-list
# Response: Lists all active sandboxes

/sandbox-destroy abc12345
# Response: Sandbox destroyed
```

**Features**:
- ✅ On-demand test environments
- ✅ Auto-cleanup after 2 hours
- ✅ Accessible from Slack
- ✅ Multiple concurrent sandboxes

---

## Option 3: Local Docker Compose Override

For manual testing on your machine without Slack integration.

### Quick Start

```bash
# Start test environment
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Run tests
npm run test:coverage

# View database with Prisma Studio
DATABASE_URL=postgresql://doingok:doingok@localhost:5433/doingok_test npm run prisma:studio

# Cleanup
docker-compose -f docker-compose.yml -f docker-compose.test.yml down
```

### Features
- ✅ Isolated test database (port 5433 vs 5432)
- ✅ Separate from development environment
- ✅ Full control over lifecycle
- ✅ Good for local development

---

## Architecture

### Container Naming Convention

```
doingok-[env]-[component]-[id]

Examples:
- doingok-postgres-sandbox-abc12345
- doingok-api-sandbox-abc12345
- doingok-postgres-test
- doingok-api-test
```

### Resource Cleanup

**GitHub Actions**: Automatic cleanup
- PostgreSQL container destroyed after job completes
- No manual intervention needed

**Slack Bot**: Automatic + Manual
- Auto-cleanup after 2 hours of inactivity
- Manual cleanup via `/sandbox-destroy` command
- Cleanup also triggered by Slack button

**Local Docker Compose**: Manual
- `docker-compose down` to cleanup
- Can keep running for debugging

---

## Monitoring & Debugging

### Check running containers

```bash
docker ps -a --filter "name=doingok"
```

### View logs

```bash
# GitHub Actions
# View in GitHub Actions UI

# Local
docker-compose logs -f api
docker-compose logs -f postgres

# Slack handler
npm run sandbox:logs
```

### Connect to test database

```bash
# Get database port
docker port doingok-postgres-test 5432

# Connect with psql
psql -h localhost -p 5433 -U doingok -d doingok_test
```

### Inspect running sandbox

```bash
docker exec doingok-api-sandbox-abc12345 npm test

# View environment
docker exec doingok-api-sandbox-abc12345 env
```

---

## CI/CD Integration

### Add to your CI/CD pipeline

```yaml
# .github/workflows/test.yml already configured
# For other CI systems (GitLab, CircleCI, etc.):

services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: doingok
      POSTGRES_PASSWORD: doingok
      POSTGRES_DB: doingok
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

script:
  - npm ci
  - npx prisma migrate deploy
  - npm run test:coverage
```

---

## Troubleshooting

### Port already in use

```bash
# Find process on port
lsof -i :5432
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
docker run -p 5435:5432 postgres:16-alpine
```

### Container won't start

```bash
# View error logs
docker logs doingok-api-sandbox-abc12345

# Check Docker daemon
docker info

# Restart Docker
systemctl restart docker  # Linux
brew services restart docker  # macOS
```

### Database connection refused

```bash
# Wait for health check
docker ps --filter "name=doingok" --format "table {{.Names}}\t{{.Status}}"

# Verify connection
docker exec doingok-postgres-sandbox-abc12345 pg_isready -U doingok
```

### Out of disk space

```bash
# Clean up old containers and images
docker system prune -a

# Remove specific sandbox
docker-compose rm -f doingok-postgres-sandbox-abc12345
```

---

## Cost Estimation (AWS Lambda)

- GitHub Actions: Included in free tier (up to 2000 minutes/month)
- Slack Bot on Lambda:
  - Per invocation: ~$0.0000002
  - Per GB-second: ~$0.0000166
  - Typical sandbox: ~$0.01 per 2-hour session
  - 100 sandboxes/month: ~$1.00

---

## Next Steps

1. **GitHub Actions** (recommended for CI/CD)
   - Already configured
   - No setup needed
   - Just push to see tests run

2. **Local Testing** (for development)
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.test.yml up
   ```

3. **Slack Bot** (optional for team collaboration)
   - Setup Slack app
   - Deploy handler to Lambda or local server
   - Team members can spin up sandboxes from Slack

Choose based on your needs:
- **CI/CD only?** → Use GitHub Actions (already done)
- **Local testing?** → Use docker-compose.test.yml
- **Team collaboration?** → Add Slack bot for on-demand sandboxes
