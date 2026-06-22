import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createGoAlertClient } from '../services/goalert.js';
import { closeMissedCheckin } from '../services/late-checkin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface CreateScheduleRequest {
  frequency: string;
  scheduledHour: number;
  windowMinutes: number;
}

interface UpdateScheduleRequest {
  frequency?: string;
  scheduledHour?: number;
  windowMinutes?: number;
  isActive?: boolean;
}

interface CreateEventRequest {
  scheduledAt: string;
  status?: 'pending' | 'completed' | 'missed' | 'late' | 'skipped';
}

interface CompleteEventRequest {
  notes?: string;
}

function getAuth(request: any): { userId: string } | null {
  const token = request.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function registerCheckinsRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  // POST /users/:userId/checkin-schedule
  fastify.post<{ Body: CreateScheduleRequest }>('/users/:userId/checkin-schedule', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot create schedule for another user' });
    }

    const { frequency, scheduledHour, windowMinutes } = request.body;

    // Validate hour
    if (scheduledHour < 0 || scheduledHour > 23) {
      return reply.status(400).send({ error: 'Hour must be between 0 and 23' });
    }

    // Validate window
    if (windowMinutes < 30 || windowMinutes > 480) {
      return reply.status(400).send({ error: 'Window must be between 30 and 480 minutes' });
    }

    try {
      const schedule = await prisma.checkinSchedule.create({
        data: {
          userId,
          frequency,
          scheduledHour,
          windowMinutes,
        },
      });

      return reply.status(201).send(schedule);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'User already has a check-in schedule' });
      }
      throw error;
    }
  });

  // GET /users/:userId/checkin-schedule
  fastify.get('/users/:userId/checkin-schedule', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot view schedule for another user' });
    }

    const schedule = await prisma.checkinSchedule.findUnique({
      where: { userId },
    });

    if (!schedule) {
      return reply.status(404).send({ error: 'No schedule found' });
    }

    return reply.send(schedule);
  });

  // PATCH /users/:userId/checkin-schedule
  fastify.patch<{ Body: UpdateScheduleRequest }>('/users/:userId/checkin-schedule', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot update schedule for another user' });
    }

    const schedule = await prisma.checkinSchedule.findUnique({
      where: { userId },
    });

    if (!schedule) {
      return reply.status(404).send({ error: 'No schedule found' });
    }

    const updated = await prisma.checkinSchedule.update({
      where: { userId },
      data: request.body,
    });

    return reply.send(updated);
  });

  // DELETE /users/:userId/checkin-schedule
  fastify.delete('/users/:userId/checkin-schedule', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot delete schedule for another user' });
    }

    await prisma.checkinSchedule.delete({
      where: { userId },
    });

    return reply.send({ message: 'Schedule deleted' });
  });

  // GET /users/:userId/checkin-events
  fastify.get('/users/:userId/checkin-events', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    const { status, page = 1, limit = 50 } = request.query;

    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot view events for another user' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await prisma.checkinEvent.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    return reply.send(events);
  });

  // POST /users/:userId/checkin-events/:eventId/complete
  fastify.post<{ Body: CompleteEventRequest }>('/users/:userId/checkin-events/:eventId/complete', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId, eventId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot update events for another user' });
    }

    const event = await prisma.checkinEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.userId !== userId) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const { notes } = request.body;

    // A late response to a missed check-in resolves the alert and tells
    // GoAlert to stop escalating.
    if (event.status === 'missed') {
      const updated = await closeMissedCheckin(prisma, createGoAlertClient(), eventId, notes);
      return reply.send(updated);
    }

    if (event.status !== 'pending') {
      return reply.status(400).send({ error: 'Only pending or missed check-ins can be completed' });
    }

    const updated = await prisma.checkinEvent.update({
      where: { id: eventId },
      data: {
        status: 'completed',
        respondedAt: new Date(),
        notes,
      },
    });

    return reply.send(updated);
  });

  // POST /users/:userId/checkin-events/:eventId/skip
  fastify.post('/users/:userId/checkin-events/:eventId/skip', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId, eventId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot update events for another user' });
    }

    const event = await prisma.checkinEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.userId !== userId) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const updated = await prisma.checkinEvent.update({
      where: { id: eventId },
      data: {
        status: 'skipped',
        respondedAt: new Date(),
      },
    });

    return reply.send(updated);
  });

  // GET /users/:userId/checkin-stats
  fastify.get('/users/:userId/checkin-stats', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot view stats for another user' });
    }

    const events = await prisma.checkinEvent.findMany({
      where: { userId },
    });

    const total = events.length;
    const completed = events.filter((e) => e.status === 'completed').length;
    const missed = events.filter((e) => e.status === 'missed').length;
    const late = events.filter((e) => e.status === 'late').length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const lastCompleted = events.filter((e) => e.status === 'completed').sort((a, b) => b.respondedAt!.getTime() - a.respondedAt!.getTime())[0];
    const lastMissed = events.filter((e) => e.status === 'missed').sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0];

    return reply.send({
      total_checkins: total,
      completed_count: completed,
      missed_count: missed,
      late_count: late,
      completion_rate: completionRate,
      last_completed: lastCompleted?.respondedAt,
      last_missed: lastMissed?.scheduledAt,
    });
  });
}
