import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { registerAuthRoutes } from './modules/auth.js';
import { registerUserRoutes } from './modules/users.js';
import { registerContactRoutes } from './modules/contacts.js';
import { registerCheckinsRoutes } from './modules/checkins.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const prisma = new PrismaClient();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Allowed web origins for CORS (comma-separated env, defaults to Vite dev server)
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Register all API modules
const registerRoutes = async () => {
  await fastify.register(cors, {
    origin: CORS_ORIGINS,
    credentials: true,
  });
  await registerAuthRoutes(fastify, prisma);
  await registerUserRoutes(fastify, prisma);
  await registerContactRoutes(fastify, prisma);
  await registerCheckinsRoutes(fastify, prisma);
};

const start = async () => {
  try {
    await registerRoutes();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
