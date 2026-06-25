import { faker } from '@faker-js/faker';
import type { UserProfile, Schedule, Contact } from '../lib/api';
import type { StoredUser } from '../lib/storage';

faker.seed(42);

export function makeStoredUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
    ...overrides,
  };
}

export function makeUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
    displayName: faker.internet.username(),
    phone: faker.phone.number({ style: 'international' }),
    timezone: 'America/New_York',
    ...overrides,
  };
}

export function makeCheckinEvent(overrides: Partial<{
  id: string;
  status: string;
  scheduledAt: string;
  respondedAt: string | null;
}> = {}) {
  return {
    id: faker.string.uuid(),
    status: 'pending',
    scheduledAt: faker.date.recent().toISOString(),
    respondedAt: null,
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: faker.string.uuid(),
    frequency: 'daily',
    scheduledHour: 9,
    windowMinutes: 120,
    escalationDelayMinutes: 15,
    isActive: true,
    ...overrides,
  };
}

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    relationship: 'friend',
    phone: faker.phone.number({ style: 'international' }),
    email: faker.internet.email(),
    priorityOrder: 1,
    notifyViaSms: true,
    notifyViaEmail: false,
    notifyViaCall: false,
    isActive: true,
    ...overrides,
  };
}
