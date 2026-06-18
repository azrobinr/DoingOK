import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, startTestServer, stopTestServer } from '../utils/test-server';
import { FastifyInstance } from 'fastify';

describe('Health Check', () => {
  let fastify: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    fastify = await createTestServer();
    baseUrl = await startTestServer(fastify);
  });

  afterAll(async () => {
    await stopTestServer(fastify);
  });

  it('should return health status', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });
});
