// Missed check-in detection.
//
// Finds pending check-ins whose response window has elapsed and that don't yet
// have an alert, then records an alert_event and marks the check-in missed.
// Designed to run every few minutes; idempotent because an existing alert_event
// for a check-in (checkin_event_id is unique on alert_events) prevents re-triggering.
// The escalation loop (escalate-alerts job) handles notifying trusted contacts.

import { PrismaClient } from '@prisma/client';

const DEFAULT_WINDOW_MINUTES = 120;

export interface TriggeredAlert {
  checkinEventId: string;
  userId: string;
}

export async function detectMissedCheckins(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<TriggeredAlert[]> {
  const pending = await prisma.checkinEvent.findMany({
    where: { status: 'pending' },
    include: {
      user: { include: { checkinSchedule: true } },
      alertEvent: true,
    },
  });

  const triggered: TriggeredAlert[] = [];

  for (const event of pending) {
    // Skip if an alert already exists for this check-in.
    if (event.alertEvent) continue;

    const windowMinutes = event.user.checkinSchedule?.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
    const deadline = new Date(event.scheduledAt.getTime() + windowMinutes * 60_000);
    if (deadline >= now) continue;

    // Record the alert and mark the check-in missed atomically so a crash
    // can't leave a "missed" event without its alert_event (or vice versa).
    await prisma.$transaction([
      prisma.alertEvent.create({
        data: {
          userId: event.userId,
          checkinEventId: event.id,
          status: 'triggered',
          escalationStep: 1,
          triggeredAt: now,
        },
      }),
      prisma.checkinEvent.update({
        where: { id: event.id },
        data: { status: 'missed' },
      }),
    ]);

    triggered.push({ checkinEventId: event.id, userId: event.userId });
  }

  return triggered;
}
