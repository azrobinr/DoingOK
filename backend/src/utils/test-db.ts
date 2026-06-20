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

  // Delete all data in dependency order (bottom-up from leaves to root)
  // DELETE doesn't lock tables like TRUNCATE does, avoiding deadlocks
  // Foreign key constraints handle cascading deletes
  const tables = [
    'push_tokens',
    'refresh_tokens',
    'alert_events',
    'tos_acceptances',
    'checkin_events',
    'checkin_schedules',
    'trusted_contacts',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
  }

  // Reset sequences for auto-increment if needed
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1;`
      );
    } catch {
      // Ignore if sequence doesn't exist (UUIDs don't use sequences)
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
