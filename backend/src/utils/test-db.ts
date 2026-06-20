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

  // Disable foreign key constraints temporarily for faster truncation
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  const tables = [
    'push_tokens',
    'alert_events',
    'checkin_events',
    'checkin_schedules',
    'trusted_contacts',
    'refresh_tokens',
    'tos_acceptances',
    'users',
  ];

  // Truncate all tables in parallel for speed
  await Promise.all(
    tables.map((table) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY;`)
    )
  );

  // Re-enable foreign key constraints
  await prisma.$executeRawUnsafe('SET session_replication_role = default;');
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
