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

  // Truncate leaf tables first (those with no dependencies), then cascade delete from users
  // This avoids deadlocks and foreign key constraint violations
  const leafTables = [
    'push_tokens',
    'refresh_tokens',
  ];

  // Truncate leaf tables first
  for (const table of leafTables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY;`);
    } catch (error) {
      // Ignore if table doesn't exist or is already empty
    }
  }

  // Truncate parent tables with CASCADE to handle foreign keys
  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "alert_events", "checkin_events", "checkin_schedules", "tos_acceptances", "trusted_contacts", "users" CASCADE RESTART IDENTITY;`
    );
  } catch (error) {
    // Fallback: truncate in dependency order
    const parentTables = [
      'alert_events',
      'checkin_events',
      'checkin_schedules',
      'tos_acceptances',
      'trusted_contacts',
      'users',
    ];
    for (const table of parentTables) {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${table}" CASCADE RESTART IDENTITY;`
        );
      } catch (e) {
        // Continue even if one fails
      }
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
