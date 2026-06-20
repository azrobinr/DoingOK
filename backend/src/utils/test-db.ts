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

  // Truncate all tables with CASCADE in correct order
  // Start from users (has most dependencies) and cascade will handle the rest
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "users" CASCADE RESTART IDENTITY;`
  );
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
