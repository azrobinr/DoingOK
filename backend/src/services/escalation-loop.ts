// Escalation loop.
//
// Runs on a schedule (every 5 minutes). For each open alert_event, walks the
// user's trusted contacts in priority_order and sends an SMS when the
// escalation delay has elapsed since the previous contact was attempted.
//
// Only contacts with notifyViaSms=true and a phone number are reached for now;
// call and email channels are wired in when those providers are added.
//
// Idempotency: escalation_contacts records are created before sending, so a
// crashed run that left a record behind treats that contact as already
// attempted on the next run rather than re-sending.
//
// Expiry: once all SMS-capable contacts have been attempted and the delay has
// elapsed since the last attempt, the alert is marked 'expired'.

import { EscalationMethod, PrismaClient } from '@prisma/client';
import { SmsClient } from './twilio.js';

const DEFAULT_ESCALATION_DELAY_MINUTES = 15;

export interface EscalationResult {
  alertId: string;
  contactId: string;
  method: EscalationMethod;
  status: 'sent' | 'failed';
}

export async function escalateAlerts(
  prisma: PrismaClient,
  smsClient: SmsClient,
  now: Date = new Date()
): Promise<EscalationResult[]> {
  const triggeredAlerts = await prisma.alertEvent.findMany({
    where: { status: 'triggered' },
    include: {
      user: {
        include: {
          trustedContacts: {
            where: { isActive: true },
            orderBy: { priorityOrder: 'asc' },
          },
          checkinSchedule: true,
        },
      },
      escalationContacts: {
        orderBy: { notifiedAt: 'desc' },
      },
    },
  });

  const results: EscalationResult[] = [];

  for (const alert of triggeredAlerts) {
    const delayMs =
      (alert.user.checkinSchedule?.escalationDelayMinutes ?? DEFAULT_ESCALATION_DELAY_MINUTES) *
      60_000;

    // Build the set of contact IDs that already have an attempt record.
    const attemptedIds = new Set(
      alert.escalationContacts
        .map((ec) => ec.trustedContactId)
        .filter(Boolean) as string[]
    );

    // Find the next reachable contact not yet attempted.
    const next = alert.user.trustedContacts.find(
      (c) => !attemptedIds.has(c.id) && c.notifyViaSms && c.phone
    );

    const lastAttempt = alert.escalationContacts[0];

    if (!next) {
      // All SMS-capable contacts have been attempted. Expire the alert once
      // the delay has elapsed after the last attempt so contacts have time
      // to act before we give up.
      if (lastAttempt) {
        const elapsed = now.getTime() - lastAttempt.notifiedAt.getTime();
        if (elapsed >= delayMs) {
          await prisma.alertEvent.update({
            where: { id: alert.id },
            data: { status: 'expired' },
          });
        }
      }
      continue;
    }

    // For the very first contact, notify immediately.
    // For subsequent contacts, enforce the escalation delay.
    if (lastAttempt) {
      const elapsed = now.getTime() - lastAttempt.notifiedAt.getTime();
      if (elapsed < delayMs) continue;
    }

    // Record the attempt before sending so a crash after send doesn't re-send.
    const record = await prisma.escalationContact.create({
      data: {
        alertEventId: alert.id,
        trustedContactId: next.id,
        priorityOrder: next.priorityOrder,
        method: 'sms',
        status: 'sent',
        notifiedAt: now,
      },
    });

    // Keep escalation_step in sync with the contact step we just reached.
    await prisma.alertEvent.update({
      where: { id: alert.id },
      data: { escalationStep: next.priorityOrder },
    });

    const userName = alert.user.displayName || alert.user.fullName;

    try {
      await smsClient.send({ to: next.phone!, method: 'sms', userName });
      results.push({ alertId: alert.id, contactId: next.id, method: 'sms', status: 'sent' });
    } catch (err) {
      await prisma.escalationContact.update({
        where: { id: record.id },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      console.error(
        `[escalation] failed to SMS contact ${next.id} for alert ${alert.id}:`,
        err
      );
      results.push({ alertId: alert.id, contactId: next.id, method: 'sms', status: 'failed' });
    }
  }

  return results;
}
