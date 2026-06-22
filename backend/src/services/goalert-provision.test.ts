import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDatabase, getPrismaInstance } from '../utils/test-db';
import { seedTestUser } from '../utils/test-fixtures';
import {
  HttpGoAlertProvisioner,
  NoopGoAlertProvisioner,
  GoAlertProvisioner,
  ProvisionResult,
} from './goalert';
import { provisionGoAlertForUser } from './goalert-provision';

const prisma = getPrismaInstance();

describe('GoAlert provisioning', () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterEach(async () => {
    await resetDatabase();
    vi.restoreAllMocks();
  });

  describe('HttpGoAlertProvisioner', () => {
    it('creates an escalation policy then a service and returns the generic key', async () => {
      const fetchMock = vi
        .fn()
        // 1) createEscalationPolicy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { createEscalationPolicy: { id: 'ep-123' } } }),
        })
        // 2) createService
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              createService: {
                id: 'svc-456',
                integrationKeys: [{ id: 'key-789', type: 'generic', name: 'DoingOK Wellness' }],
              },
            },
          }),
        });
      vi.stubGlobal('fetch', fetchMock);

      const provisioner = new HttpGoAlertProvisioner('http://goalert.test', 'admin-key');
      const result = await provisioner.provisionUserService({ userId: 'u-1', displayName: 'Alice' });

      expect(result).toEqual({ serviceId: 'svc-456', integrationKey: 'key-789' });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Both calls hit the GraphQL endpoint with bearer auth.
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://goalert.test/api/graphql');
      expect(init.headers.Authorization).toBe('Bearer admin-key');

      // The escalation policy is created before the service, and the service
      // references it.
      const epBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const svcBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(epBody.query).toContain('createEscalationPolicy');
      expect(svcBody.query).toContain('createService');
      expect(svcBody.variables.input.escalationPolicyID).toBe('ep-123');
      expect(svcBody.variables.input.newIntegrationKeys[0].type).toBe('generic');
    });

    it('throws when GraphQL returns errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ errors: [{ message: 'permission denied' }] }),
        })
      );

      const provisioner = new HttpGoAlertProvisioner('http://goalert.test', 'admin-key');
      await expect(
        provisioner.provisionUserService({ userId: 'u-1', displayName: 'Alice' })
      ).rejects.toThrow(/permission denied/);
    });
  });

  describe('provisionGoAlertForUser', () => {
    it('stores the integration key on the user when provisioning succeeds', async () => {
      const user = await seedTestUser('prov@example.com', 'Prov User', undefined, 'UTC');

      const fake: GoAlertProvisioner = {
        async provisionUserService(): Promise<ProvisionResult> {
          return { serviceId: 'svc-1', integrationKey: 'integration-key-abc' };
        },
      };

      const key = await provisionGoAlertForUser(prisma, fake, user.id);
      expect(key).toBe('integration-key-abc');

      const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
      expect(refreshed?.goalertServiceKey).toBe('integration-key-abc');
    });

    it('is best-effort: a provisioning failure does not throw or set a key', async () => {
      const user = await seedTestUser('fail@example.com', 'Fail User', undefined, 'UTC');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failing: GoAlertProvisioner = {
        async provisionUserService(): Promise<ProvisionResult> {
          throw new Error('GoAlert is down');
        },
      };

      const key = await provisionGoAlertForUser(prisma, failing, user.id);
      expect(key).toBeNull();

      const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
      expect(refreshed?.goalertServiceKey).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns null for the no-op provisioner without setting a key', async () => {
      const user = await seedTestUser('noop@example.com', 'Noop User', undefined, 'UTC');
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const key = await provisionGoAlertForUser(prisma, new NoopGoAlertProvisioner(), user.id);
      expect(key).toBeNull();

      const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
      expect(refreshed?.goalertServiceKey).toBeNull();
    });
  });
});
