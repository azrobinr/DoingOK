import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const testUsers = {
  alice: {
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    phone: '+1-555-0101',
    timezone: 'America/New_York',
    password: 'SecurePass123!',
  },
  bob: {
    email: 'bob@example.com',
    fullName: 'Bob Johnson',
    phone: '+1-555-0102',
    timezone: 'America/Los_Angeles',
    password: 'AnotherPass456!',
  },
  carol: {
    email: 'carol@example.com',
    fullName: 'Carol Williams',
    phone: '+1-555-0103',
    timezone: 'America/Chicago',
    password: 'ThirdPass789!',
  },
};

export const testContacts = {
  aliceSon: {
    fullName: 'David Smith',
    relationship: 'Son',
    phone: '+1-555-0201',
    email: 'david@example.com',
    priorityOrder: 1,
    notifyViaSms: true,
    notifyViaEmail: false,
    notifyViaCall: false,
  },
  aliceDaughter: {
    fullName: 'Emma Smith',
    relationship: 'Daughter',
    phone: '+1-555-0202',
    email: 'emma@example.com',
    priorityOrder: 2,
    notifyViaSms: false,
    notifyViaEmail: true,
    notifyViaCall: false,
  },
  bobFriend: {
    fullName: 'Frank Brown',
    relationship: 'Friend',
    phone: '+1-555-0203',
    email: 'frank@example.com',
    priorityOrder: 1,
    notifyViaSms: true,
    notifyViaEmail: false,
    notifyViaCall: true,
  },
};

export const testSchedules = {
  dailyMorning: {
    frequency: 'daily',
    scheduledHour: 9,
    windowMinutes: 120,
    escalationDelayMinutes: 15,
  },
  weeklyFriday: {
    frequency: 'weekly',
    scheduledHour: 14,
    windowMinutes: 180,
    escalationDelayMinutes: 15,
  },
};

export async function seedTestUser(
  email: string,
  fullName: string,
  phone?: string,
  timezone: string = 'UTC'
) {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  return prisma.user.create({
    data: {
      email,
      fullName,
      phone,
      timezone,
      passwordHash,
      isVerified: true,
    },
  });
}

export async function seedTestContact(userId: string, contactData: typeof testContacts.aliceSon) {
  return prisma.trustedContact.create({
    data: {
      userId,
      ...contactData,
    },
  });
}

export async function seedTestSchedule(userId: string, scheduleData: typeof testSchedules.dailyMorning) {
  return prisma.checkinSchedule.create({
    data: {
      userId,
      ...scheduleData,
    },
  });
}

export async function seedTestCheckinEvent(
  userId: string,
  scheduledAt: Date,
  status: 'pending' | 'completed' | 'missed' | 'late' | 'skipped' = 'pending'
) {
  return prisma.checkinEvent.create({
    data: {
      userId,
      scheduledAt,
      status,
    },
  });
}

export async function seedTestTosAcceptance(
  userId: string,
  version: string = '1.0',
  ipAddress: string = '127.0.0.1'
) {
  return prisma.tosAcceptance.create({
    data: {
      userId,
      version,
      ipAddress,
      userAgent: 'Test Client/1.0',
    },
  });
}

export async function seedTestPushToken(
  userId: string,
  platform: 'ios' | 'android' = 'ios',
  token?: string
) {
  return prisma.pushToken.create({
    data: {
      userId,
      platform,
      token: token || `${platform}-token-${Math.random().toString(36).substring(7)}`,
      deviceName: `Test ${platform} device`,
    },
  });
}
