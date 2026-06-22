import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { seedTestUser, seedTestContact, seedTestSchedule, testContacts, testSchedules } from '../utils/test-fixtures';
import { escalateAlerts } from './escalation-loop';
import { SmsClient, OutboundMessage } from './twilio';

const prisma = getPrismaInstance();

class FakeSmsClient implements SmsClient {
  sent: OutboundMessage[] = [];
  async send(msg: OutboundMessage) {
    this.sent.push(msg);
  }
}

class FailingSmsClient implements SmsClient {
  async send(_msg: OutboundMessage) {
    throw new Error('Twilio is down');
  }
}

async function seedTriggeredAlert(userId: string) {
  return prisma.alertEvent.create({
    data: {
      userId,
      status: 'triggered',
      escalationStep: 1,
      triggeredAt: new Date(),
    },
  });
}

describe('escalateAlerts', () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterEach(async () => {
    await resetDatabase();
  });

  it('sends SMS to contact 1 immediately on first run', async () => {
    const user = await seedTestUser('esc@example.com', 'Alice');
    await seedTestContact(user.id, testContacts.aliceSon); // SMS, priority 1
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    const alert = await seedTriggeredAlert(user.id);

    const sms = new FakeSmsClient();
    const results = await escalateAlerts(prisma, sms, new Date());

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('sent');
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].to).toBe(testContacts.aliceSon.phone);

    const records = await prisma.escalationContact.findMany({ where: { alertEventId: alert.id } });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('sent');
    expect(records[0].priorityOrder).toBe(1);
  });

  it('does not re-notify the same contact before the delay elapses', async () => {
    const user = await seedTestUser('esc2@example.com', 'Alice');
    await seedTestContact(user.id, testContacts.aliceSon);
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    const alert = await seedTriggeredAlert(user.id);

    const t0 = new Date('2026-06-22T09:00:00Z');
    const sms = new FakeSmsClient();
    await escalateAlerts(prisma, sms, t0);

    // 5 minutes later — delay not elapsed
    const t5 = new Date('2026-06-22T09:05:00Z');
    const results = await escalateAlerts(prisma, sms, t5);

    expect(results).toHaveLength(0);
    expect(sms.sent).toHaveLength(1); // only the first send
  });

  it('advances to contact 2 after the delay elapses', async () => {
    const user = await seedTestUser('esc3@example.com', 'Alice');
    // Contact 1: SMS; contact 2: also SMS (override aliceDaughter to have SMS)
    await seedTestContact(user.id, testContacts.aliceSon); // priority 1, SMS
    await seedTestContact(user.id, {
      ...testContacts.aliceDaughter,
      notifyViaSms: true,
      phone: '+15550202',
    }); // priority 2, SMS
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    const alert = await seedTriggeredAlert(user.id);

    const t0 = new Date('2026-06-22T09:00:00Z');
    const sms = new FakeSmsClient();
    await escalateAlerts(prisma, sms, t0);

    // 16 minutes later — delay elapsed
    const t16 = new Date('2026-06-22T09:16:00Z');
    const results = await escalateAlerts(prisma, sms, t16);

    expect(results).toHaveLength(1);
    expect(sms.sent).toHaveLength(2);
    expect(sms.sent[1].to).toBe('+15550202');

    const records = await prisma.escalationContact.findMany({
      where: { alertEventId: alert.id },
      orderBy: { priorityOrder: 'asc' },
    });
    expect(records).toHaveLength(2);
  });

  it('skips contacts without SMS capability', async () => {
    const user = await seedTestUser('esc4@example.com', 'Alice');
    // aliceDaughter has notifyViaSms: false
    await seedTestContact(user.id, testContacts.aliceDaughter);
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    await seedTriggeredAlert(user.id);

    const sms = new FakeSmsClient();
    const results = await escalateAlerts(prisma, sms, new Date());

    expect(results).toHaveLength(0);
    expect(sms.sent).toHaveLength(0);
  });

  it('skips resolved alerts', async () => {
    const user = await seedTestUser('esc5@example.com', 'Alice');
    await seedTestContact(user.id, testContacts.aliceSon);
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    await prisma.alertEvent.create({
      data: { userId: user.id, status: 'resolved', escalationStep: 1, triggeredAt: new Date() },
    });

    const sms = new FakeSmsClient();
    const results = await escalateAlerts(prisma, sms, new Date());

    expect(results).toHaveLength(0);
    expect(sms.sent).toHaveLength(0);
  });

  it('records a failed attempt and does not retry the same contact', async () => {
    const user = await seedTestUser('esc6@example.com', 'Alice');
    await seedTestContact(user.id, testContacts.aliceSon);
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    const alert = await seedTriggeredAlert(user.id);

    const t0 = new Date('2026-06-22T09:00:00Z');
    const failing = new FailingSmsClient();
    const results = await escalateAlerts(prisma, failing, t0);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');

    const records = await prisma.escalationContact.findMany({ where: { alertEventId: alert.id } });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('failed');
    expect(records[0].errorMessage).toContain('Twilio is down');

    // Next run: failed contact is treated as attempted — no retry
    const t5 = new Date('2026-06-22T09:05:00Z');
    const sms = new FakeSmsClient();
    const secondResults = await escalateAlerts(prisma, sms, t5);
    // Delay not elapsed yet, and only 1 contact — nothing to do
    expect(secondResults).toHaveLength(0);
  });

  it('stops escalating once all contacts have been attempted', async () => {
    const user = await seedTestUser('esc7@example.com', 'Alice');
    await seedTestContact(user.id, testContacts.aliceSon); // only SMS contact
    await seedTestSchedule(user.id, testSchedules.dailyMorning);
    await seedTriggeredAlert(user.id);

    const t0 = new Date('2026-06-22T09:00:00Z');
    const sms = new FakeSmsClient();
    await escalateAlerts(prisma, sms, t0);

    // After delay — no more contacts
    const t16 = new Date('2026-06-22T09:16:00Z');
    const results = await escalateAlerts(prisma, sms, t16);

    expect(results).toHaveLength(0);
    expect(sms.sent).toHaveLength(1);
  });
});
