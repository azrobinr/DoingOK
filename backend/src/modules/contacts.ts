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

    const { priorityOrder: newPriority, ...otherFields } = request.body as UpdateContactRequest;

    if (newPriority !== undefined && newPriority !== contact.priorityOrder) {
      // Reorder atomically within a transaction. Moving the target contact to a
      // temporary sentinel priority (-1) first clears its slot, so the range
      // shift never produces a transient duplicate, and the final placement lands
      // on a freshly vacated position.
      const oldPriority = contact.priorityOrder;
      await prisma.$transaction(async (tx) => {
        // Park the target at -1 (never a real priority) to free its current slot.
        await tx.trustedContact.update({
          where: { id: contactId },
          data: { priorityOrder: -1 },
        });

        if (newPriority < oldPriority) {
          // Moving up: push everything in [newPriority, oldPriority-1] down one.
          await tx.$executeRaw`
            UPDATE trusted_contacts
            SET priority_order = priority_order + 1
            WHERE user_id = ${userId}::uuid
              AND priority_order >= ${newPriority}
              AND priority_order < ${oldPriority}
          `;
        } else {
          // Moving down: pull everything in [oldPriority+1, newPriority] up one.
          await tx.$executeRaw`
            UPDATE trusted_contacts
            SET priority_order = priority_order - 1
            WHERE user_id = ${userId}::uuid
              AND priority_order > ${oldPriority}
              AND priority_order <= ${newPriority}
          `;
        }

        // Place the target at the vacated slot.
        await tx.trustedContact.update({
          where: { id: contactId },
          data: { priorityOrder: newPriority },
        });
      });
    }

    const hasOtherFields = Object.keys(otherFields).length > 0;
    const updated = hasOtherFields
      ? await prisma.trustedContact.update({ where: { id: contactId }, data: otherFields })
      : await prisma.trustedContact.findUniqueOrThrow({ where: { id: contactId } });

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

    await prisma.$transaction([
      prisma.trustedContact.delete({ where: { id: contactId } }),
    ]);

    // Close the gap left by the removed contact so priorities remain contiguous.
    await prisma.$executeRaw`
      UPDATE trusted_contacts
      SET priority_order = priority_order - 1
      WHERE user_id = ${userId}::uuid
        AND priority_order > ${contact.priorityOrder}
    `;

    return reply.send({ message: 'Contact deleted' });
  });
}
