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

  // Delete in reverse dependency order to handle foreign key constraints
  // Start from leaf tables (no dependencies) and work up to root
  const tables = [
    'push_tokens',
    'refresh_tokens',
    'alert_events',
    'checkin_events',
    'tos_acceptances',
    'checkin_schedules',
    'trusted_contacts',
    'users',
  ];

  // Delete all records from each table
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    } catch (error) {
      // Log but continue - some tables might have dependencies
      console.error(`Failed to delete from ${table}:`, error);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
