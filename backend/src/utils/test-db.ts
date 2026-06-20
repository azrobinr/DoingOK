import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load .env file for tests
dotenv.config();

let prismaInstance: PrismaClient | null = null;

export function getPrismaInstance(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export async function resetDatabase(): Promise<void> {
  const prisma = getPrismaInstance();

  // Use a single TRUNCATE CASCADE statement to clear all tables at once
  // CASCADE ensures all dependent tables are also truncated
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "alert_events",
      "checkin_events",
      "checkin_schedules",
      "tos_acceptances",
      "trusted_contacts",
      "refresh_tokens",
      "push_tokens",
      "users"
    CASCADE RESTART IDENTITY;
  `);
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
