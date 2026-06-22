// Late check-in handling.
//
// When a user responds after their window has already elapsed (the check-in
// was marked "missed"), we mark the check-in "late" and resolve the alert_event.
// Resolving the alert_event stops the escalation loop from notifying further contacts.

import { CheckinEvent, PrismaClient } from '@prisma/client';

export async function closeMissedCheckin(
  prisma: PrismaClient,
  eventId: string,
  notes?: string
): Promise<CheckinEvent> {
  const event = await prisma.checkinEvent.findUnique({
    where: { id: eventId },
    include: { alertEvent: true },
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

  return updated;
}
