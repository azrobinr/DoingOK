import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
  timezone?: string;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

interface PushTokenRequest {
  platform: 'ios' | 'android';
  token: string;
  deviceName?: string;
}


export async function registerUserRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  // GET /users/:id
  fastify.get('/users/:id', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        phone: true,
        timezone: true,
        isVerified: true,
        isPaused: true,
        pausedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(user);
  });

  // PATCH /users/:id
  fastify.patch<{ Body: UpdateProfileRequest }>('/users/:id', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot update another user' });
    }

    const { displayName, phone, timezone } = request.body;

    // Validate timezone if provided
    if (timezone && !isValidTimezone(timezone)) {
      return reply.status(400).send({ error: 'Invalid timezone' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(displayName && { displayName }),
        ...(phone && { phone }),
        ...(timezone && { timezone }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        phone: true,
        timezone: true,
        updatedAt: true,
      },
    });

    return reply.send(user);
  });

  // PATCH /users/:id/password
  fastify.patch<{ Body: PasswordChangeRequest }>('/users/:id/password', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot update another user' });
    }

    const { currentPassword, newPassword } = request.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    if (!isValidPassword(newPassword)) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters with uppercase, number, and special character' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return reply.send({ message: 'Password updated' });
  });

  // POST /users/:id/pause — suppress check-ins until the user resumes
  fastify.post('/users/:id/pause', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return reply.status(401).send({ error: 'Not authenticated' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET) as { userId: string }; }
    catch { return reply.status(401).send({ error: 'Invalid token' }); }

    const { id } = request.params;
    if (decoded.userId !== id) return reply.status(403).send({ error: 'Cannot pause another user' });

    const user = await prisma.user.update({
      where: { id },
      data: { isPaused: true, pausedAt: new Date() },
      select: { id: true, isPaused: true, pausedAt: true },
    });

    return reply.send(user);
  });

  // POST /users/:id/resume — lift a planned-absence pause
  fastify.post('/users/:id/resume', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return reply.status(401).send({ error: 'Not authenticated' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET) as { userId: string }; }
    catch { return reply.status(401).send({ error: 'Invalid token' }); }

    const { id } = request.params;
    if (decoded.userId !== id) return reply.status(403).send({ error: 'Cannot resume another user' });

    const user = await prisma.user.update({
      where: { id },
      data: { isPaused: false, pausedAt: null },
      select: { id: true, isPaused: true, pausedAt: true },
    });

    return reply.send(user);
  });

  // DELETE /users/:id
  fastify.delete('/users/:id', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot delete another user' });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return reply.send({ message: 'User deleted' });
  });

  // POST /users/:id/push-tokens
  fastify.post<{ Body: PushTokenRequest }>('/users/:id/push-tokens', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot add tokens for another user' });
    }

    const { platform, token: pushToken, deviceName } = request.body;

    // Check if token already exists
    const existing = await prisma.pushToken.findUnique({
      where: { token: pushToken },
    });

    if (existing) {
      // Update lastUsedAt
      await prisma.pushToken.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() },
      });

      return reply.send({ message: 'Token already registered' });
    }

    const pushTokenRecord = await prisma.pushToken.create({
      data: {
        userId: id,
        platform,
        token: pushToken,
        deviceName,
      },
    });

    return reply.status(201).send(pushTokenRecord);
  });

  // GET /users/:id/push-tokens
  fastify.get('/users/:id/push-tokens', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot view tokens for another user' });
    }

    const tokens = await prisma.pushToken.findMany({
      where: { userId: id },
      select: {
        id: true,
        platform: true,
        deviceName: true,
        registeredAt: true,
        lastUsedAt: true,
      },
    });

    return reply.send(tokens);
  });

  // DELETE /users/:id/push-tokens/:tokenId
  fastify.delete('/users/:id/push-tokens/:tokenId', async (request: any, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { id, tokenId } = request.params;
    if (decoded.userId !== id) {
      return reply.status(403).send({ error: 'Cannot delete tokens for another user' });
    }

    const pushToken = await prisma.pushToken.findUnique({
      where: { id: tokenId },
    });

    if (!pushToken || pushToken.userId !== id) {
      return reply.status(404).send({ error: 'Token not found' });
    }

    await prisma.pushToken.delete({
      where: { id: tokenId },
    });

    return reply.send({ message: 'Token deleted' });
  });
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*]/.test(password);
}

function isValidTimezone(tz: string): boolean {
  const validTimezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
  ];
  return validTimezones.includes(tz);
}
