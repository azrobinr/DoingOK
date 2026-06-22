import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { GoAlertProvisioner, createGoAlertProvisioner } from '../services/goalert.js';
import { provisionGoAlertForUser } from '../services/goalert-provision.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  timezone?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshRequest {
  refreshToken: string;
}

interface AcceptTosRequest {
  version: string;
}

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  provisioner: GoAlertProvisioner = createGoAlertProvisioner()
) {
  // POST /auth/register
  fastify.post<{ Body: RegisterRequest }>('/auth/register', async (request, reply) => {
    const { email, password, fullName, phone, timezone = 'UTC' } = request.body;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters with uppercase, number, and special character' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        timezone,
        isVerified: false,
      },
    });

    // Provision a GoAlert service for this user (best-effort: a GoAlert outage
    // must not block registration). No-op when GoAlert is not configured.
    await provisionGoAlertForUser(prisma, provisioner, user.id);

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress: request.ip,
      },
    });

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
      refreshToken,
    });
  });

  // POST /auth/login
  fastify.post<{ Body: LoginRequest }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress: request.ip,
      },
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
      refreshToken,
    });
  });

  // POST /auth/refresh
  fastify.post<{ Body: RefreshRequest }>('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user || user.deletedAt) {
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });

      return reply.send({ accessToken });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // POST /auth/logout
  fastify.post('/auth/logout', async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(400).send({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      // Revoke all refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId },
        data: { revokedAt: new Date() },
      });

      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // POST /auth/accept-tos
  fastify.post<{ Body: AcceptTosRequest }>('/auth/accept-tos', async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { version } = request.body;

      // Check if already accepted this version
      const existing = await prisma.tosAcceptance.findFirst({
        where: { userId: decoded.userId, version },
      });

      if (existing) {
        return reply.status(409).send({ error: 'You have already accepted this version' });
      }

      await prisma.tosAcceptance.create({
        data: {
          userId: decoded.userId,
          version,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      return reply.status(201).send({ message: 'TOS accepted' });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
