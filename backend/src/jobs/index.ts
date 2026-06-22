// Background job system (pg-boss).
//
// pg-boss uses PostgreSQL as its queue, so no extra infrastructure is needed.
// This module wires the scheduled jobs to the core-loop services. It is only
// started when ENABLE_JOBS is set, so tests, CI, and the test sandbox don't
// spin up a scheduler.
//
// Schedules (cron is evaluated in UTC):
//   schedule-checkin-prompts  hourly   create today's check-in events (per
//                                       user TZ, idempotent) + enqueue pushes
//   send-checkin-push         on demand deliver a prompt for one event
//   detect-missed-checkins    every 5m  record alert_events for elapsed windows
//   escalate-alerts           every 5m  walk contacts and send SMS for open alerts
//   expire-refresh-tokens     daily     prune expired refresh tokens

import PgBoss from 'pg-boss';
import { PrismaClient } from '@prisma/client';
import { generateCheckinEventsForToday } from '../services/checkin-scheduler.js';
import { detectMissedCheckins } from '../services/missed-checkin.js';
import { escalateAlerts } from '../services/escalation-loop.js';
import { sendCheckinPush, ConsoleNotifier, Notifier } from '../services/notifications.js';
import { SmsClient, createSmsClient } from '../services/twilio.js';

export const JOBS = {
  schedulePrompts: 'schedule-checkin-prompts',
  sendPush: 'send-checkin-push',
  detectMissed: 'detect-missed-checkins',
  escalateAlerts: 'escalate-alerts',
  expireTokens: 'expire-refresh-tokens',
} as const;

interface SendPushData {
  eventId: string;
}

export interface JobSystemOptions {
  notifier?: Notifier;
  smsClient?: SmsClient;
}

export interface JobSystem {
  boss: PgBoss;
  stop: () => Promise<void>;
}

export async function startJobSystem(
  prisma: PrismaClient,
  options: JobSystemOptions = {}
): Promise<JobSystem> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start the job system');
  }

  const notifier = options.notifier ?? new ConsoleNotifier();
  const smsClient = options.smsClient ?? createSmsClient();

  const boss = new PgBoss({ connectionString });
  boss.on('error', (err) => console.error('[pg-boss] error:', err));
  await boss.start();

  // pg-boss v10 requires queues to exist before work/send/schedule.
  await Promise.all(Object.values(JOBS).map((name) => boss.createQueue(name)));

  // --- workers --------------------------------------------------------------

  await boss.work<SendPushData>(JOBS.sendPush, async (jobs) => {
    for (const job of jobs) {
      await sendCheckinPush(prisma, notifier, job.data.eventId);
    }
  });

  await boss.work(JOBS.schedulePrompts, async () => {
    const events = await generateCheckinEventsForToday(prisma);
    for (const event of events) {
      await boss.send(JOBS.sendPush, { eventId: event.id } satisfies SendPushData);
    }
    console.log(`[jobs] schedule-checkin-prompts created ${events.length} event(s)`);
  });

  await boss.work(JOBS.detectMissed, async () => {
    const triggered = await detectMissedCheckins(prisma);
    if (triggered.length > 0) {
      console.log(`[jobs] detect-missed-checkins triggered ${triggered.length} alert(s)`);
    }
  });

  await boss.work(JOBS.escalateAlerts, async () => {
    const notified = await escalateAlerts(prisma, smsClient);
    if (notified.length > 0) {
      console.log(`[jobs] escalate-alerts sent ${notified.length} notification(s)`);
    }
  });

  await boss.work(JOBS.expireTokens, async () => {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) console.log(`[jobs] expire-refresh-tokens pruned ${count} token(s)`);
  });

  // --- schedules (UTC) ------------------------------------------------------

  await boss.schedule(JOBS.schedulePrompts, '0 * * * *');   // hourly, TZ-correct via idempotency
  await boss.schedule(JOBS.detectMissed, '*/5 * * * *');   // every 5 minutes
  await boss.schedule(JOBS.escalateAlerts, '*/5 * * * *'); // every 5 minutes
  await boss.schedule(JOBS.expireTokens, '0 3 * * *');     // daily 03:00 UTC

  console.log('[jobs] background job system started');

  return { boss, stop: () => boss.stop() };
}
