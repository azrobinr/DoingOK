// Late check-in handling.
//
// When a user responds after their window has already elapsed (the check-in
// was marked "missed" and a GoAlert alert fired), we mark the check-in "late",
// resolve the alert_event, and tell GoAlert to close the alert so contacts
// stop being escalated.

import { CheckinEvent, PrismaClient } from '@prisma/client';
import { GoAlertClient } from './goalert.js';

export async function closeMissedCheckin(
  prisma: PrismaClient,
  goalert: GoAlertClient,
  eventId: string,
  notes?: string
): Promise<CheckinEvent> {
  const event = await prisma.checkinEvent.findUnique({
    where: { id: eventId },
    include: { user: true, alertEvent: true },
  });

  if (!event) {
    throw new Error(`Check-in event ${eventId} not found`);
  }

  const now = new Date();

  const [updated] = await prisma.$transaction([
    prisma.checkinEvent.update({
      where: { id: eventId },
      data: { status: 'late', respondedAt: now, notes },
    }),
    ...(event.alertEvent && event.alertEvent.status !== 'resolved'
      ? [
          prisma.alertEvent.update({
            where: { id: event.alertEvent.id },
            data: { status: 'resolved', resolvedAt: now, resolutionNotes: 'Late check-in' },
          }),
        ]
      : []),
  ]);

  if (event.alertEvent) {
    const who = event.user.displayName || event.user.fullName;
    await goalert.closeAlert({
      serviceKey: event.user.goalertServiceKey ?? '',
      summary: `Wellness check needed: ${who} has not checked in`,
      dedupKey: event.alertEvent.goalertDedupKey,
    });
  }

  return updated;
}
