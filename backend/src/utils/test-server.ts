import Fastify, { FastifyInstance } from 'fastify';

export async function createTestServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
  });

  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  return fastify;
}

export async function startTestServer(fastify: FastifyInstance): Promise<string> {
  await fastify.listen({ port: 0, host: '127.0.0.1' });
  const address = fastify.server.address();
  if (typeof address === 'string') {
    return address;
  }
  return `http://127.0.0.1:${address?.port}`;
}

export async function stopTestServer(fastify: FastifyInstance): Promise<void> {
  await fastify.close();
}
