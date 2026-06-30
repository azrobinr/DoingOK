import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { seedTestUser, seedTestSchedule, seedTestCheckinEvent, seedTestPushToken, testSchedules } from '../utils/test-fixtures';
import {
  generateCheckinEventsForToday,
  scheduledInstantForToday,
  zonedWallClockToUtc,
} from './checkin-scheduler';
import { detectMissedCheckins } from './missed-checkin';
import { sendCheckinPush, Notifier, PushMessage } from './notifications';
import { closeMissedCheckin } from './late-checkin';

const prisma = getPrismaInstance();

class FakeNotifier implements Notifier {
  sent: PushMessage[] = [];
  async send(m: PushMessage) {
    this.sent.push(m);
  }
}

describe('Core check-in loop', () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterEach(async () => {
    await resetDatabase();
  });

  describe('timezone helpers', () => {
    it('converts a local wall-clock hour to the correct UTC instant', () => {
      // 2026-01-15 09:00 in New York (EST, UTC-5) => 14:00 UTC
      const utc = zonedWallClockToUtc(2026, 1, 15, 9, 'America/New_York');
      expect(utc.toISOString()).toBe('2026-01-15T14:00:00.000Z');
    });

    it('honors daylight saving time', () => {
      // 2026-07-15 09:00 in New York (EDT, UTC-4) => 13:00 UTC
      const utc = zonedWallClockToUtc(2026, 7, 15, 9, 'America/New_York');
      expect(utc.toISOString()).toBe('2026-07-15T13:00:00.000Z');
    });

    it('computes today\'s scheduled instant in the user timezone', () => {
      const now = new Date('2026-03-10T20:00:00.000Z'); // already Mar 10 in US
      const instant = scheduledInstantForToday(now, 9, 'America/Los_Angeles');
      // Mar 10 2026 09:00 PDT (UTC-7) => 16:00 UTC
      expect(instant.toISOString()).toBe('2026-03-10T16:00:00.000Z');
    });
  });

  describe('generateCheckinEventsForToday', () => {
    it('creates one pending event for an active daily schedule', async () => {
      const user = await seedTestUser('sched@example.com', 'Sched User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);

      const created = await generateCheckinEventsForToday(prisma, new Date('2026-05-01T00:30:00.000Z'));

      expect(created).toHaveLength(1);
      expect(created[0].userId).toBe(user.id);
      expect(created[0].status).toBe('pending');
      expect(created[0].scheduledAt.toISOString()).toBe('2026-05-01T09:00:00.000Z');
    });

    it('is idempotent across repeated runs on the same day', async () => {
      const user = await seedTestUser('idem@example.com', 'Idem User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      const now = new Date('2026-05-01T00:30:00.000Z');

      const first = await generateCheckinEventsForToday(prisma, now);
      const second = await generateCheckinEventsForToday(prisma, now);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
      const all = await prisma.checkinEvent.findMany({ where: { userId: user.id } });
      expect(all).toHaveLength(1);
    });

    it('skips paused users', async () => {
      const user = await seedTestUser('paused-sched@example.com', 'Paused User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      await prisma.user.update({ where: { id: user.id }, data: { isPaused: true } });

      const created = await generateCheckinEventsForToday(prisma, new Date('2026-05-01T00:30:00.000Z'));
      expect(created).toHaveLength(0);
    });

    it('skips inactive schedules and non-daily frequency', async () => {
      const inactiveUser = await seedTestUser('inactive@example.com', 'Inactive', undefined, 'UTC');
      const schedule = await seedTestSchedule(inactiveUser.id, testSchedules.dailyMorning);
      await prisma.checkinSchedule.update({ where: { id: schedule.id }, data: { isActive: false } });

      const weeklyUser = await seedTestUser('weekly@example.com', 'Weekly', undefined, 'UTC');
      await seedTestSchedule(weeklyUser.id, testSchedules.weeklyFriday);

      const created = await generateCheckinEventsForToday(prisma, new Date('2026-05-01T00:30:00.000Z'));
      expect(created).toHaveLength(0);
    });
  });

  describe('detectMissedCheckins', () => {
    it('creates an alert_event and marks the event missed once the window elapses', async () => {
      const user = await seedTestUser('missed@example.com', 'Missed User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      const scheduledAt = new Date('2026-05-01T09:00:00.000Z');
      const event = await seedTestCheckinEvent(user.id, scheduledAt, 'pending');

      // 3 hours later: window (120 min) has elapsed.
      const triggered = await detectMissedCheckins(prisma, new Date('2026-05-01T12:00:00.000Z'));

      expect(triggered).toHaveLength(1);
      expect(triggered[0].checkinEventId).toBe(event.id);

      const refreshed = await prisma.checkinEvent.findUnique({ where: { id: event.id } });
      expect(refreshed?.status).toBe('missed');

      const alert = await prisma.alertEvent.findUnique({ where: { checkinEventId: event.id } });
      expect(alert?.status).toBe('triggered');
    });

    it('does not trigger for a paused user', async () => {
      const user = await seedTestUser('paused-missed@example.com', 'Paused Missed', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'pending');
      await prisma.user.update({ where: { id: user.id }, data: { isPaused: true } });

      // 3 hours later: window elapsed, but user is paused — no alert should fire.
      const triggered = await detectMissedCheckins(prisma, new Date('2026-05-01T12:00:00.000Z'));
      expect(triggered).toHaveLength(0);

      const alerts = await prisma.alertEvent.findMany({ where: { userId: user.id } });
      expect(alerts).toHaveLength(0);
    });

    it('does not trigger before the window elapses', async () => {
      const user = await seedTestUser('within@example.com', 'Within User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'pending');

      // Only 1 hour later: still inside the 2-hour window.
      const triggered = await detectMissedCheckins(prisma, new Date('2026-05-01T10:00:00.000Z'));

      expect(triggered).toHaveLength(0);
    });

    it('is idempotent: a second run does not double-trigger', async () => {
      const user = await seedTestUser('once@example.com', 'Once User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'pending');

      const now = new Date('2026-05-01T12:00:00.000Z');
      await detectMissedCheckins(prisma, now);
      const second = await detectMissedCheckins(prisma, now);

      expect(second).toHaveLength(0);
      const alerts = await prisma.alertEvent.findMany({ where: { userId: user.id } });
      expect(alerts).toHaveLength(1);
    });
  });

  describe('sendCheckinPush', () => {
    it('notifies every registered device and stamps promptedAt', async () => {
      const user = await seedTestUser('push@example.com', 'Push User', undefined, 'UTC');
      await seedTestPushToken(user.id, 'ios', 'ios-token-1');
      await seedTestPushToken(user.id, 'android', 'android-token-1');
      const event = await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'pending');

      const notifier = new FakeNotifier();
      const result = await sendCheckinPush(prisma, notifier, event.id);

      expect(result.delivered).toBe(2);
      expect(result.promptedAt).not.toBeNull();
      expect(notifier.sent.map((m) => m.platform).sort()).toEqual(['android', 'ios']);

      const refreshed = await prisma.checkinEvent.findUnique({ where: { id: event.id } });
      expect(refreshed?.promptedAt).not.toBeNull();
    });

    it('does not send for a non-pending event', async () => {
      const user = await seedTestUser('done@example.com', 'Done User', undefined, 'UTC');
      await seedTestPushToken(user.id, 'ios');
      const event = await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'completed');

      const notifier = new FakeNotifier();
      const result = await sendCheckinPush(prisma, notifier, event.id);

      expect(result.delivered).toBe(0);
      expect(notifier.sent).toHaveLength(0);
    });
  });

  describe('closeMissedCheckin (late check-in)', () => {
    it('marks the event late and resolves the alert_event', async () => {
      const user = await seedTestUser('late@example.com', 'Late User', undefined, 'UTC');
      await seedTestSchedule(user.id, testSchedules.dailyMorning);
      const event = await seedTestCheckinEvent(user.id, new Date('2026-05-01T09:00:00.000Z'), 'pending');

      await detectMissedCheckins(prisma, new Date('2026-05-01T12:00:00.000Z'));

      const updated = await closeMissedCheckin(prisma, event.id, 'Sorry, I overslept');

      expect(updated.status).toBe('late');
      expect(updated.respondedAt).not.toBeNull();

      const alert = await prisma.alertEvent.findUnique({ where: { checkinEventId: event.id } });
      expect(alert?.status).toBe('resolved');
      expect(alert?.resolvedAt).not.toBeNull();
    });
  });
});
