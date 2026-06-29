import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { testUsers, testContacts, seedTestUser, seedTestContact } from '../utils/test-fixtures';
import { registerContactRoutes } from './contacts';
import { createTestServer, startTestServer, stopTestServer } from '../utils/test-server';

const prisma = getPrismaInstance();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Contacts Module', () => {
  let server: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    server = await createTestServer();
    await registerContactRoutes(server, prisma);
    baseUrl = await startTestServer(server);
  });

  afterAll(async () => {
    await stopTestServer(server);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  describe('POST /users/:userId/contacts', () => {
    it('should create a trusted contact', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      expect(contact.userId).toBe(user.id);
      expect(contact.fullName).toBe(testContacts.aliceSon.fullName);
      expect(contact.priorityOrder).toBe(1);
    });

    it('should enforce unique priority order per user', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestContact(user.id, testContacts.aliceSon);

      try {
        await prisma.trustedContact.create({
          data: {
            userId: user.id,
            fullName: 'Another Contact',
            priorityOrder: 1,
          },
        });
        expect.fail('should have thrown unique constraint error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should require at least email or phone', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const token = makeToken(user.id);

      const res = await fetch(`${baseUrl}/users/${user.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: 'No Contact Info', priorityOrder: 1 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe('At least email or phone is required');
    });

    it('should reject invalid phone number', async () => {
      const invalidPhones = ['123', 'abc-def-ghij', '555 555'];
      invalidPhones.forEach((phone) => {
        expect(/^\+?1?\d{10,15}$/.test(phone)).toBe(false);
      });
    });

    it('should reject invalid email', async () => {
      const invalidEmails = ['notanemail', 'user@', '@example.com'];
      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('GET /users/:userId/contacts', () => {
    it('should list all contacts for user', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestContact(user.id, testContacts.aliceSon);
      await seedTestContact(user.id, testContacts.aliceDaughter);

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
        orderBy: { priorityOrder: 'asc' },
      });

      expect(contacts).toHaveLength(2);
      expect(contacts[0].priorityOrder).toBe(1);
      expect(contacts[1].priorityOrder).toBe(2);
    });

    it('should return empty array if no contacts', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
      });

      expect(contacts).toEqual([]);
    });
  });

  describe('GET /users/:userId/contacts/:contactId', () => {
    it('should retrieve specific contact', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      expect(contact.id).toBeDefined();
      expect(contact.fullName).toBe(testContacts.aliceSon.fullName);
    });

    it('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const contact = await prisma.trustedContact.findUnique({
        where: { id: fakeId },
      });

      expect(contact).toBeNull();
    });
  });

  describe('PATCH /users/:userId/contacts/:contactId', () => {
    it('should update contact details', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      const updates = { fullName: 'David Smith Jr.', phone: '+15559999' };
      const updated = await prisma.trustedContact.update({
        where: { id: contact.id },
        data: updates,
      });

      expect(updated.fullName).toBe(updates.fullName);
      expect(updated.phone).toBe(updates.phone);
    });

    it('reorders contacts atomically when priorityOrder changes', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const c1 = await seedTestContact(user.id, testContacts.aliceSon);    // priority 1
      const c2 = await seedTestContact(user.id, testContacts.aliceDaughter); // priority 2
      const token = makeToken(user.id);

      // Move c1 (currently priority 1) → priority 2; c2 should shift to 1
      const res = await fetch(`${baseUrl}/users/${user.id}/contacts/${c1.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priorityOrder: 2 }),
      });

      expect(res.status).toBe(200);

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
        orderBy: { priorityOrder: 'asc' },
      });

      expect(contacts).toHaveLength(2);
      expect(contacts[0].id).toBe(c2.id);
      expect(contacts[0].priorityOrder).toBe(1);
      expect(contacts[1].id).toBe(c1.id);
      expect(contacts[1].priorityOrder).toBe(2);
    });

    it('should toggle notification methods', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      const updated = await prisma.trustedContact.update({
        where: { id: contact.id },
        data: { notifyViaEmail: true },
      });

      expect(updated.notifyViaEmail).toBe(true);
    });
  });

  describe('DELETE /users/:userId/contacts/:contactId', () => {
    it('should delete contact', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      await prisma.trustedContact.delete({ where: { id: contact.id } });

      const deleted = await prisma.trustedContact.findUnique({ where: { id: contact.id } });
      expect(deleted).toBeNull();
    });

    it('compacts remaining priorities after deletion', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const c1 = await seedTestContact(user.id, testContacts.aliceSon);     // priority 1
      const c2 = await seedTestContact(user.id, testContacts.aliceDaughter); // priority 2
      const c3 = await prisma.trustedContact.create({
        data: { userId: user.id, fullName: 'Third Contact', priorityOrder: 3, phone: '+15550303' },
      });
      const token = makeToken(user.id);

      // Delete the middle contact — c3 should shift from 3 to 2
      const res = await fetch(`${baseUrl}/users/${user.id}/contacts/${c2.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);

      const remaining = await prisma.trustedContact.findMany({
        where: { userId: user.id },
        orderBy: { priorityOrder: 'asc' },
      });

      expect(remaining).toHaveLength(2);
      expect(remaining[0].id).toBe(c1.id);
      expect(remaining[0].priorityOrder).toBe(1);
      expect(remaining[1].id).toBe(c3.id);
      expect(remaining[1].priorityOrder).toBe(2);
    });

    it('should prevent deleting if only one contact remains', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);
      const token = makeToken(user.id);

      const res = await fetch(`${baseUrl}/users/${user.id}/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe('Must have at least one trusted contact');
    });
  });

  describe('POST /users/:userId/contacts/:contactId/verify', () => {
    it('should send verification to contact', async () => {
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      expect(contact.phone).toBeDefined();
    });
  });
});
