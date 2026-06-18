# Backend Testing Guide

This guide covers the automated test setup for the DoingOK API backend.

## Overview

The test suite is designed to validate API endpoints and database interactions. Tests are organized by feature module:

- **health.test.ts** — Health check endpoint
- **auth.test.ts** — Authentication (register, login, refresh, logout, TOS acceptance)
- **users.test.ts** — User profile management (CRUD, passwords, email changes, push tokens)
- **contacts.test.ts** — Trusted contacts management
- **checkins.test.ts** — Check-in scheduling and event tracking

## Test Architecture

### Test Utilities

**`src/utils/test-db.ts`** — Database setup/teardown
- `getPrismaInstance()` — Get or create Prisma client
- `resetDatabase()` — Truncate all tables (call in beforeEach)
- `disconnectDatabase()` — Close Prisma connection (call in afterAll)

**`src/utils/test-fixtures.ts`** — Test data and seed functions
- `testUsers` — Pre-defined user data for tests
- `testContacts` — Pre-defined contact data
- `testSchedules` — Pre-defined schedule data
- `seedTestUser()` — Create a test user in database
- `seedTestContact()` — Create a test contact for a user
- `seedTestSchedule()` — Create a check-in schedule
- `seedTestCheckinEvent()` — Create a check-in event
- Plus helpers for TOS acceptance, push tokens, etc.

**`src/utils/test-server.ts`** — Fastify test server
- `createTestServer()` — Create Fastify instance for testing
- `startTestServer()` — Start server on random port
- `stopTestServer()` — Shutdown server

### Test Organization

Each test module uses this structure:

```typescript
describe('Module Name', () => {
  const prisma = getPrismaInstance();

  beforeEach(async () => {
    await resetDatabase();  // Clean state for each test
  });

  afterEach(async () => {
    await resetDatabase();
  });

  describe('Endpoint Name', () => {
    it('should do something', async () => {
      // Arrange: Set up test data
      const user = await seedTestUser(email, name);

      // Act: Make request or database operation
      const result = await prisma.someTable.create({...});

      // Assert: Verify expectations
      expect(result).toBeDefined();
    });
  });
});
```

## Running Tests

### Run all tests once
```bash
npm test
```

### Watch mode (re-run on file changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

### Run with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npm test src/modules/auth.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --grep "should register"
```

## Test Data Strategy

### Pre-defined Test Users

```typescript
testUsers.alice:
  email: alice@example.com
  fullName: Alice Smith
  password: SecurePass123!  // Used by seedTestUser()

testUsers.bob:
  email: bob@example.com
  fullName: Bob Johnson
  password: SecurePass123!

testUsers.carol:
  email: carol@example.com
  fullName: Carol Williams
  password: SecurePass123!
```

### Pre-defined Test Contacts

```typescript
testContacts.aliceSon:
  fullName: David Smith
  relationship: Son
  phone: +1-555-0201
  email: david@example.com
  priorityOrder: 1

// Plus: aliceDaughter, bobFriend
```

### Creating Test Data

```typescript
// Create a single user
const user = await seedTestUser('email@example.com', 'Full Name');

// Create multiple data
const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
const contact = await seedTestContact(user.id, testContacts.aliceSon);
const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

// Raw Prisma for custom test data
const event = await prisma.checkinEvent.create({
  data: {
    userId: user.id,
    scheduledAt: new Date(),
    status: 'completed',
  },
});
```

## Test Template

When implementing a new endpoint, add tests to the corresponding module file:

```typescript
describe('POST /endpoint', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    await resetDatabase();
  });

  it('should do what the endpoint should do', async () => {
    // Setup
    const user = await seedTestUser('test@example.com', 'Test User');

    // When the endpoint is implemented:
    // - Send HTTP request via fastify.inject() or fetch()
    // - Verify status code (201, 200, 400, etc.)
    // - Verify response body
    // - Verify database state changed correctly

    const result = await prisma.someTable.findUnique({
      where: { id: 'test-id' },
    });

    expect(result).toBeDefined();
  });

  it('should reject invalid input', async () => {
    // Test validation logic
    const invalidData = { /* ... */ };
    expect(invalidData.field).not.toBeDefined();
  });
});
```

## Endpoint Implementation Checklist

For each test file, when implementing the endpoint:

1. **Auth Module** (`auth.test.ts`)
   - [ ] POST /auth/register
   - [ ] POST /auth/login
   - [ ] POST /auth/refresh
   - [ ] POST /auth/logout
   - [ ] POST /auth/verify-email
   - [ ] POST /auth/accept-tos

2. **Users Module** (`users.test.ts`)
   - [ ] GET /users/:id
   - [ ] PATCH /users/:id
   - [ ] PATCH /users/:id/password
   - [ ] PATCH /users/:id/email
   - [ ] DELETE /users/:id
   - [ ] POST /users/:id/push-tokens
   - [ ] GET /users/:id/push-tokens
   - [ ] DELETE /users/:id/push-tokens/:tokenId

3. **Contacts Module** (`contacts.test.ts`)
   - [ ] POST /users/:userId/contacts
   - [ ] GET /users/:userId/contacts
   - [ ] GET /users/:userId/contacts/:contactId
   - [ ] PATCH /users/:userId/contacts/:contactId
   - [ ] DELETE /users/:userId/contacts/:contactId
   - [ ] POST /users/:userId/contacts/:contactId/verify

4. **Check-ins Module** (`checkins.test.ts`)
   - [ ] POST /users/:userId/checkin-schedule
   - [ ] GET /users/:userId/checkin-schedule
   - [ ] PATCH /users/:userId/checkin-schedule
   - [ ] DELETE /users/:userId/checkin-schedule
   - [ ] GET /users/:userId/checkin-events
   - [ ] POST /users/:userId/checkin-events/:eventId/complete
   - [ ] POST /users/:userId/checkin-events/:eventId/skip
   - [ ] GET /users/:userId/checkin-stats

## Testing HTTP Endpoints

Once endpoints are implemented, use Fastify's test injection:

```typescript
describe('GET /users/:id', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createTestServer();
    // Register routes
    fastify.get('/users/:id', async (request, reply) => {
      // ... implementation
    });
  });

  it('should retrieve user', async () => {
    const user = await seedTestUser('test@example.com', 'Test User');

    const response = await fastify.inject({
      method: 'GET',
      url: `/users/${user.id}`,
      headers: {
        authorization: `Bearer ${token}`, // Add JWT if needed
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.email).toBe('test@example.com');
  });
});
```

## Database Isolation

Tests automatically reset the database between runs:

```typescript
beforeEach(async () => {
  await resetDatabase();  // Truncates all tables
});
```

This ensures:
- No test pollution (one test doesn't affect another)
- Clean state for each test
- Predictable test results
- No stale data from previous runs

## Debugging Tests

### Run single test
```bash
npm test -- src/modules/auth.test.ts -t "should register"
```

### Enable logging
```bash
DEBUG=* npm test
```

### Use Prisma Studio during test development
```bash
npm run prisma:studio
# View database state while writing tests
```

## Common Patterns

### Testing validation
```typescript
it('should reject invalid email', async () => {
  const invalidEmails = ['notanemail', 'user@', '@example.com'];
  invalidEmails.forEach((email) => {
    expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
```

### Testing authorization
```typescript
it('should prevent unauthorized updates', async () => {
  const user1 = await seedTestUser('user1@example.com', 'User One');
  const user2 = await seedTestUser('user2@example.com', 'User Two');

  expect(user1.id).not.toBe(user2.id);
  // When endpoint is implemented, verify user1 cannot update user2
});
```

### Testing cascading deletes
```typescript
it('should delete related data', async () => {
  const user = await seedTestUser(email, name);
  const contact = await seedTestContact(user.id, contactData);

  await prisma.user.delete({ where: { id: user.id } });

  const deletedContact = await prisma.trustedContact.findUnique({
    where: { id: contact.id },
  });

  expect(deletedContact).toBeNull(); // Cascade delete worked
});
```

## Next Steps

1. **Implement endpoints** using the test descriptions as specification
2. **Run tests** to verify implementation
3. **Add integration tests** for multi-step flows (register → verify → login)
4. **Add performance tests** for critical paths
5. **Set up CI/CD** to run tests on every commit

## Resources

- Vitest docs: https://vitest.dev
- Prisma testing: https://www.prisma.io/docs/guides/testing
- Fastify testing: https://www.fastify.io/docs/latest/Guides/Testing/
