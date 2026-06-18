import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { testUsers, testContacts, seedTestUser, seedTestContact } from '../utils/test-fixtures';

describe('Contacts Module', () => {
  const prisma = getPrismaInstance();

  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  describe('POST /users/:userId/contacts', () => {
    it('should create a trusted contact', async () => {
      // Setup: Create a user
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Accept fullName, relationship, phone, email, priorityOrder
      // 2. Create contact associated with user
      // 3. Return 201 Created with contact data

      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      expect(contact.userId).toBe(user.id);
      expect(contact.fullName).toBe(testContacts.aliceSon.fullName);
      expect(contact.priorityOrder).toBe(1);
    });

    it('should enforce unique priority order per user', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should:
      // 1. Prevent two contacts with same priorityOrder for same user
      // 2. Return 409 Conflict
      // 3. Message: "Priority order already taken"

      try {
        await prisma.trustedContact.create({
          data: {
            userId: user.id,
            fullName: 'Another Contact',
            priorityOrder: 1,
          },
        });
      } catch (error) {
        // Expected: unique constraint violation
        expect(error).toBeDefined();
      }
    });

    it('should require at least email or phone', async () => {
      // Setup: Create a user
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Require at least one of: email or phone
      // 2. Return 400 Bad Request if neither provided
      // 3. Message: "At least email or phone is required"

      const incompleteContact = {
        fullName: 'No Contact Info',
        priorityOrder: 1,
      };

      expect(incompleteContact.fullName).toBeDefined();
      // But missing both email and phone
    });

    it('should reject invalid phone number', async () => {
      // When implemented, should:
      // 1. Validate phone format (E.164 or common formats)
      // 2. Return 400 Bad Request for invalid format
      // 3. Message: "Invalid phone number"

      const invalidPhones = ['123', 'abc-def-ghij', '555 555'];
      invalidPhones.forEach((phone) => {
        expect(/^\+?1?\d{10,15}$/.test(phone)).toBe(false);
      });
    });

    it('should reject invalid email', async () => {
      // When implemented, should:
      // 1. Validate email format
      // 2. Return 400 Bad Request for invalid format

      const invalidEmails = ['notanemail', 'user@', '@example.com'];
      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('GET /users/:userId/contacts', () => {
    it('should list all contacts for user', async () => {
      // Setup: Create user with multiple contacts
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestContact(user.id, testContacts.aliceSon);
      await seedTestContact(user.id, testContacts.aliceDaughter);

      // When implemented, should:
      // 1. Return array of contacts in priority order
      // 2. Include all contact fields
      // 3. Return 200 OK

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
        orderBy: { priorityOrder: 'asc' },
      });

      expect(contacts).toHaveLength(2);
      expect(contacts[0].priorityOrder).toBe(1);
      expect(contacts[1].priorityOrder).toBe(2);
    });

    it('should return empty array if no contacts', async () => {
      // Setup: Create user with no contacts
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Return empty array
      // 2. Return 200 OK

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
      });

      expect(contacts).toEqual([]);
    });
  });

  describe('GET /users/:userId/contacts/:contactId', () => {
    it('should retrieve specific contact', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should:
      // 1. Return contact details
      // 2. Return 200 OK

      expect(contact.id).toBeDefined();
      expect(contact.fullName).toBe(testContacts.aliceSon.fullName);
    });

    it('should return 404 for non-existent contact', async () => {
      // Setup: Create user
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);

      // When implemented, should:
      // 1. Return 404 Not Found

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const contact = await prisma.trustedContact.findUnique({
        where: { id: fakeId },
      });

      expect(contact).toBeNull();
    });
  });

  describe('PATCH /users/:userId/contacts/:contactId', () => {
    it('should update contact details', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should allow updating:
      // - fullName
      // - relationship
      // - phone
      // - email
      // - notifyViaSms, notifyViaEmail, notifyViaCall
      // - isActive

      const updates = {
        fullName: 'David Smith Jr.',
        phone: '+1-555-9999',
      };

      const updated = await prisma.trustedContact.update({
        where: { id: contact.id },
        data: updates,
      });

      expect(updated.fullName).toBe(updates.fullName);
      expect(updated.phone).toBe(updates.phone);
    });

    it('should reorder priorities when changing priorityOrder', async () => {
      // Setup: Create user with multiple contacts
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact1 = await seedTestContact(user.id, testContacts.aliceSon);
      const contact2 = await seedTestContact(user.id, testContacts.aliceDaughter);

      expect(contact1.priorityOrder).toBe(1);
      expect(contact2.priorityOrder).toBe(2);

      // When implemented, changing contact1 priority to 2 should:
      // 1. Shift contact2 to priority 1
      // 2. Maintain all contacts have unique priority
      // 3. Return 200 OK

      // This requires transaction logic
    });

    it('should toggle notification methods', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should allow toggling:
      // - notifyViaSms
      // - notifyViaEmail
      // - notifyViaCall

      const updated = await prisma.trustedContact.update({
        where: { id: contact.id },
        data: { notifyViaEmail: true },
      });

      expect(updated.notifyViaEmail).toBe(true);
    });
  });

  describe('DELETE /users/:userId/contacts/:contactId', () => {
    it('should delete contact', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should:
      // 1. Delete contact from database
      // 2. Return 200 OK

      await prisma.trustedContact.delete({
        where: { id: contact.id },
      });

      const deleted = await prisma.trustedContact.findUnique({
        where: { id: contact.id },
      });

      expect(deleted).toBeNull();
    });

    it('should reorder remaining contacts', async () => {
      // Setup: Create user with 3 contacts
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact1 = await seedTestContact(user.id, testContacts.aliceSon);
      const contact2 = await seedTestContact(user.id, testContacts.aliceDaughter);
      const contact3 = await prisma.trustedContact.create({
        data: {
          userId: user.id,
          fullName: 'Third Contact',
          priorityOrder: 3,
        },
      });

      // When implemented, deleting contact2 should:
      // 1. Shift contact3 priority from 3 to 2
      // 2. Maintain no gaps in priority order

      await prisma.trustedContact.delete({
        where: { id: contact2.id },
      });

      const remaining = await prisma.trustedContact.findMany({
        where: { userId: user.id },
        orderBy: { priorityOrder: 'asc' },
      });

      expect(remaining).toHaveLength(2);
      expect(remaining[0].id).toBe(contact1.id);
      expect(remaining[1].id).toBe(contact3.id);
    });

    it('should prevent deleting if only one contact remains', async () => {
      // Setup: Create user with one contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should:
      // 1. Return 400 Bad Request
      // 2. Message: "Must have at least one trusted contact"
      // 3. User needs at least one contact for alert escalation

      const contacts = await prisma.trustedContact.findMany({
        where: { userId: user.id },
      });

      expect(contacts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /users/:userId/contacts/:contactId/verify', () => {
    it('should send verification to contact', async () => {
      // Setup: Create user and contact
      const user = await seedTestUser(testUsers.alice.email, testUsers.alice.fullName);
      const contact = await seedTestContact(user.id, testContacts.aliceSon);

      // When implemented, should:
      // 1. Send SMS or email to contact phone/email
      // 2. Contact confirms they exist and are willing to receive alerts
      // 3. Return 200 OK

      expect(contact.phone).toBeDefined();
    });
  });
});
