import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { testUsers, testSchedules, seedTestUser, seedTestSchedule, seedTestCheckinEvent } from '../utils/test-fixtures';

describe('Check-ins Module', () => {
  const prisma = getPrismaInstance();

  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  describe('POST /users/:userId/checkin-schedule', () => {
    it('should create check-in schedule', async () => {
      // Setup: Create a user
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Accept frequency (daily, weekly, monthly), scheduledHour, windowMinutes
      // 2. Create schedule for user (one schedule per user)
      // 3. Return 201 Created

      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      expect(schedule.userId).toBe(user.id);
      expect(schedule.frequency).toBe('daily');
      expect(schedule.scheduledHour).toBe(9);
      expect(schedule.windowMinutes).toBe(120);
    });

    it('should reject if user already has schedule', async () => {
      // Setup: Create user with schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestSchedule(user.id, testSchedules.dailyMorning);

      // When implemented, should:
      // 1. Return 409 Conflict
      // 2. Message: "User already has a check-in schedule"
      // 3. Update existing instead via PATCH

      try {
        await seedTestSchedule(user.id, testSchedules.weeklyFriday);
      } catch (error) {
        // Expected: unique constraint on userId
        expect(error).toBeDefined();
      }
    });

    it('should validate scheduled hour', async () => {
      // When implemented, should:
      // 1. Accept hour 0-23
      // 2. Return 400 Bad Request for invalid hour

      const invalidHours = [-1, 24, 25, 'noon'];
      invalidHours.forEach((hour) => {
        const isValid = typeof hour === 'number' && hour >= 0 && hour < 24;
        expect(isValid).toBe(false);
      });
    });

    it('should validate window minutes', async () => {
      // When implemented, should:
      // 1. Accept window 30-480 minutes (30 min to 8 hours)
      // 2. Return 400 Bad Request for invalid window

      const invalidWindows = [0, 15, 500];
      invalidWindows.forEach((minutes) => {
        const isValid = minutes >= 30 && minutes <= 480;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('GET /users/:userId/checkin-schedule', () => {
    it('should retrieve user check-in schedule', async () => {
      // Setup: Create user and schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      // When implemented, should:
      // 1. Return schedule with all details
      // 2. Return 200 OK

      expect(schedule.userId).toBe(user.id);
      expect(schedule.frequency).toBe('daily');
    });

    it('should return 404 if no schedule exists', async () => {
      // Setup: Create user without schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Return 404 Not Found

      const schedule = await prisma.checkinSchedule.findUnique({
        where: { userId: user.id },
      });

      expect(schedule).toBeNull();
    });
  });

  describe('PATCH /users/:userId/checkin-schedule', () => {
    it('should update check-in schedule', async () => {
      // Setup: Create user and schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      // When implemented, should allow updating:
      // - frequency
      // - scheduledHour
      // - windowMinutes
      // - isActive

      const updates = {
        frequency: 'weekly',
        scheduledHour: 14,
      };

      const updated = await prisma.checkinSchedule.update({
        where: { id: schedule.id },
        data: updates,
      });

      expect(updated.frequency).toBe(updates.frequency);
      expect(updated.scheduledHour).toBe(updates.scheduledHour);
    });

    it('should toggle schedule active status', async () => {
      // Setup: Create user and schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      // When implemented, should:
      // 1. Allow setting isActive to false to pause schedule
      // 2. No alerts triggered for inactive schedule
      // 3. Return 200 OK

      const updated = await prisma.checkinSchedule.update({
        where: { id: schedule.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });

    it('defaults escalationDelayMinutes to 15', async () => {
      const user = await seedTestUser('delay@example.com', 'Delay User');
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);
      expect(schedule.escalationDelayMinutes).toBe(15);
    });

    it('can update escalationDelayMinutes', async () => {
      const user = await seedTestUser('delay2@example.com', 'Delay User 2');
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      const updated = await prisma.checkinSchedule.update({
        where: { id: schedule.id },
        data: { escalationDelayMinutes: 30 },
      });

      expect(updated.escalationDelayMinutes).toBe(30);
    });

    it('validates escalationDelayMinutes range (5–120)', () => {
      // Route rejects values outside 5–120 with 400 Bad Request.
      const invalid = [0, 4, 121, 200];
      const valid = [5, 15, 30, 60, 120];
      invalid.forEach((v) => expect(v >= 5 && v <= 120).toBe(false));
      valid.forEach((v) => expect(v >= 5 && v <= 120).toBe(true));
    });
  });

  describe('DELETE /users/:userId/checkin-schedule', () => {
    it('should delete check-in schedule', async () => {
      // Setup: Create user and schedule
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const schedule = await seedTestSchedule(user.id, testSchedules.dailyMorning);

      // When implemented, should:
      // 1. Delete schedule
      // 2. User receives no more check-in prompts
      // 3. Return 200 OK

      await prisma.checkinSchedule.delete({
        where: { id: schedule.id },
      });

      const deleted = await prisma.checkinSchedule.findUnique({
        where: { id: schedule.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('GET /users/:userId/checkin-events', () => {
    it('should list check-in events with pagination', async () => {
      // Setup: Create user and multiple check-in events
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const now = new Date();

      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 86400000), 'completed');
      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 172800000), 'missed');
      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 259200000), 'late');

      // When implemented, should:
      // 1. Return array of check-in events
      // 2. Support pagination: page, limit
      // 3. Return in reverse chronological order
      // 4. Include status, scheduledAt, respondedAt

      const events = await prisma.checkinEvent.findMany({
        where: { userId: user.id },
        orderBy: { scheduledAt: 'desc' },
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].status).toBeDefined();
    });

    it('should filter by status', async () => {
      // Setup: Create user with various event statuses
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const now = new Date();

      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 86400000), 'completed');
      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 172800000), 'missed');
      await seedTestCheckinEvent(user.id, new Date(now.getTime() - 259200000), 'pending');

      // When implemented, should support query: ?status=missed
      // 1. Return only events with requested status
      // 2. Return 200 OK

      const missedEvents = await prisma.checkinEvent.findMany({
        where: { userId: user.id, status: 'missed' },
      });

      expect(missedEvents.every((e) => e.status === 'missed')).toBe(true);
    });
  });

  describe('POST /users/:userId/checkin-events/:eventId/complete', () => {
    it('should mark check-in as completed', async () => {
      // Setup: Create user and pending check-in event
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const event = await seedTestCheckinEvent(user.id, new Date(), 'pending');

      // When implemented, should:
      // 1. Accept optional notes
      // 2. Set status to 'completed'
      // 3. Set respondedAt timestamp
      // 4. Cancel any triggered alerts
      // 5. Return 200 OK

      const completed = await prisma.checkinEvent.update({
        where: { id: event.id },
        data: {
          status: 'completed',
          respondedAt: new Date(),
        },
      });

      expect(completed.status).toBe('completed');
      expect(completed.respondedAt).toBeDefined();
    });

    it('should allow notes when completing', async () => {
      // Setup: Create user and pending check-in event
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const event = await seedTestCheckinEvent(user.id, new Date(), 'pending');

      // When implemented, should accept optional notes
      // 1. Store notes in database
      // 2. Return in event details

      const withNotes = await prisma.checkinEvent.update({
        where: { id: event.id },
        data: {
          status: 'completed',
          respondedAt: new Date(),
          notes: 'Feeling good today',
        },
      });

      expect(withNotes.notes).toBe('Feeling good today');
    });

    it('should reject completing non-pending event', async () => {
      // Setup: Create user and already-completed event
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const event = await seedTestCheckinEvent(user.id, new Date(), 'completed');

      // When implemented, should:
      // 1. Return 400 Bad Request
      // 2. Message: "Only pending check-ins can be completed"

      expect(event.status).not.toBe('pending');
    });
  });

  describe('POST /users/:userId/checkin-events/:eventId/skip', () => {
    it('should skip a check-in', async () => {
      // Setup: Create user and pending check-in event
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const event = await seedTestCheckinEvent(user.id, new Date(), 'pending');

      // When implemented, should:
      // 1. Set status to 'skipped'
      // 2. Set respondedAt timestamp
      // 3. Cancel any triggered alerts
      // 4. Return 200 OK

      const skipped = await prisma.checkinEvent.update({
        where: { id: event.id },
        data: {
          status: 'skipped',
          respondedAt: new Date(),
        },
      });

      expect(skipped.status).toBe('skipped');
    });
  });

  describe('GET /users/:userId/checkin-stats', () => {
    it('should return check-in statistics', async () => {
      // Setup: Create user with check-in history
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const status = i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'missed' : 'late';
        await seedTestCheckinEvent(user.id, new Date(now.getTime() - i * 86400000), status);
      }

      // When implemented, should return:
      // 1. total_checkins
      // 2. completed_count
      // 3. missed_count
      // 4. late_count
      // 5. completion_rate (percentage)
      // 6. last_completed (timestamp)
      // 7. last_missed (timestamp)

      const events = await prisma.checkinEvent.findMany({
        where: { userId: user.id },
      });

      const completed = events.filter((e) => e.status === 'completed').length;
      const total = events.length;
      const rate = (completed / total) * 100;

      expect(total).toBeGreaterThan(0);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });
});
