import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface CreateContactRequest {
  fullName: string;
  relationship?: string;
  phone?: string;
  email?: string;
  priorityOrder: number;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  notifyViaCall?: boolean;
}

interface UpdateContactRequest {
  fullName?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  priorityOrder?: number;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  notifyViaCall?: boolean;
  isActive?: boolean;
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

export async function registerContactRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  // POST /users/:userId/contacts
  fastify.post<{ Body: CreateContactRequest }>('/users/:userId/contacts', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot add contacts for another user' });
    }

    const { fullName, relationship, phone, email, priorityOrder, notifyViaSms = true, notifyViaEmail = false, notifyViaCall = false } = request.body;

    // Validate at least email or phone
    if (!email && !phone) {
      return reply.status(400).send({ error: 'At least email or phone is required' });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' });
    }

    // Validate phone format if provided
    if (phone && !/^\+?1?\d{10,15}$/.test(phone)) {
      return reply.status(400).send({ error: 'Invalid phone number' });
    }

    try {
      const contact = await prisma.trustedContact.create({
        data: {
          userId,
          fullName,
          relationship,
          phone,
          email,
          priorityOrder,
          notifyViaSms,
          notifyViaEmail,
          notifyViaCall,
        },
      });

      return reply.status(201).send(contact);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Priority order already taken' });
      }
      throw error;
    }
  });

  // GET /users/:userId/contacts
  fastify.get('/users/:userId/contacts', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot view contacts for another user' });
    }

    const contacts = await prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { priorityOrder: 'asc' },
    });

    return reply.send(contacts);
  });

  // GET /users/:userId/contacts/:contactId
  fastify.get('/users/:userId/contacts/:contactId', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId, contactId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot view contacts for another user' });
    }

    const contact = await prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    return reply.send(contact);
  });

  // PATCH /users/:userId/contacts/:contactId
  fastify.patch<{ Body: UpdateContactRequest }>('/users/:userId/contacts/:contactId', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId, contactId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot update contacts for another user' });
    }

    const contact = await prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    const updated = await prisma.trustedContact.update({
      where: { id: contactId },
      data: request.body,
    });

    return reply.send(updated);
  });

  // DELETE /users/:userId/contacts/:contactId
  fastify.delete('/users/:userId/contacts/:contactId', async (request: any, reply) => {
    const auth = getAuth(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { userId, contactId } = request.params;
    if (auth.userId !== userId) {
      return reply.status(403).send({ error: 'Cannot delete contacts for another user' });
    }

    const contact = await prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    // Check if this is the last contact
    const count = await prisma.trustedContact.count({
      where: { userId },
    });

    if (count <= 1) {
      return reply.status(400).send({ error: 'Must have at least one trusted contact' });
    }

    await prisma.trustedContact.delete({
      where: { id: contactId },
    });

    return reply.send({ message: 'Contact deleted' });
  });
}
