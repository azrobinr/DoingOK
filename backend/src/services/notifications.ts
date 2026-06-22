// Push notification delivery.
//
// The Notifier interface abstracts the actual transport (APNs for iOS, FCM
// for Android). A real implementation is a follow-up; ConsoleNotifier logs so
// the check-in prompt path is exercised end-to-end in dev/test.

import { PrismaClient } from '@prisma/client';

export interface PushMessage {
  platform: string;
  token: string;
  title: string;
  body: string;
}

export interface Notifier {
  send(message: PushMessage): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  async send({ platform, token, title, body }: PushMessage): Promise<void> {
    console.log(`[push:${platform}] -> ${token.slice(0, 12)}… "${title}": ${body}`);
  }
}

export interface SendCheckinPushResult {
  delivered: number;
  promptedAt: Date | null;
}

// Sends the daily check-in prompt to every registered device for the event's
// user and stamps the event's promptedAt. Returns how many devices were
// notified. A pending event with no devices is still stamped (so we don't
// re-prompt) but reports delivered: 0.
export async function sendCheckinPush(
  prisma: PrismaClient,
  notifier: Notifier,
  eventId: string
): Promise<SendCheckinPushResult> {
  const event = await prisma.checkinEvent.findUnique({
    where: { id: eventId },
    include: { user: { include: { pushTokens: true } } },
  });

  if (!event) {
    throw new Error(`Check-in event ${eventId} not found`);
  }
  if (event.status !== 'pending') {
    // Already responded to or superseded; nothing to prompt.
    return { delivered: 0, promptedAt: event.promptedAt };
  }

  const title = 'Time for your DoingOK check-in';
  const body = `Hi ${event.user.displayName || event.user.fullName}, let your circle know you're doing OK.`;

  let delivered = 0;
  for (const device of event.user.pushTokens) {
    await notifier.send({ platform: device.platform, token: device.token, title, body });
    delivered += 1;
  }

  const updated = await prisma.checkinEvent.update({
    where: { id: eventId },
    data: { promptedAt: new Date() },
  });

  return { delivered, promptedAt: updated.promptedAt };
}
