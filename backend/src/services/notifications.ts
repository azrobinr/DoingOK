// Push notification delivery.
//
// ExpoPushNotifier sends to Expo's push gateway (https://exp.host/--/api/v2/push/send),
// which forwards to APNs (iOS) and FCM (Android). Expo push tokens are registered
// by the mobile app via POST /users/:id/push-tokens. No separate API key is required
// for the Expo push service — the ExponentPushToken itself is the credential.
//
// ConsoleNotifier is the no-op fallback used in tests and local dev when
// EXPO_PUSH_URL is not set.

import { PrismaClient } from '@prisma/client';

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  platform: string;
  token: string;
  title: string;
  body: string;
}

export interface Notifier {
  send(message: PushMessage): Promise<void>;
}

export class ExpoPushNotifier implements Notifier {
  async send({ token, title, body }: PushMessage): Promise<void> {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify([{ to: token, title, body, sound: 'default' }]),
    });

    if (!res.ok) {
      throw new Error(`Expo push HTTP ${res.status}: ${await res.text()}`);
    }

    const { data } = await res.json() as { data: Array<{ status: string; message?: string }> };
    const ticket = data[0];
    if (ticket?.status === 'error') {
      // Log but don't throw — a bad token shouldn't crash the whole job run.
      console.error(`[push] Expo ticket error for token ${token.slice(0, 20)}…: ${ticket.message}`);
    }
  }
}

export class ConsoleNotifier implements Notifier {
  async send({ platform, token, title, body }: PushMessage): Promise<void> {
    console.log(`[push:${platform}] -> ${token.slice(0, 12)}… "${title}": ${body}`);
  }
}

export function createNotifier(): Notifier {
  // ConsoleNotifier in test/sandbox; ExpoPushNotifier when the job system runs.
  if (process.env.ENABLE_JOBS === 'true') {
    return new ExpoPushNotifier();
  }
  return new ConsoleNotifier();
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
