import type { FastifyInstance } from 'fastify';
import { buildInfo } from '../lib/build-info.js';
import { prisma } from '../lib/prisma.js';

async function pingDatabase(): Promise<'ok' | 'fail'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'fail';
  }
}

function socketStatus(app: FastifyInstance): 'ok' | 'unavailable' {
  return app.io ? 'ok' : 'unavailable';
}

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const db = await pingDatabase();
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      service: 'dcc-api',
      db,
      socket: socketStatus(app),
      version: buildInfo.version,
      gitSha: buildInfo.gitSha,
      realtimeMode: buildInfo.realtimeMode,
    };
  });

  app.get('/ready', async (_request, reply) => {
    const db = await pingDatabase();
    if (db !== 'ok') {
      return reply.status(503).send({
        status: 'not_ready',
        db,
      });
    }
    return {
      status: 'ready',
      db,
    };
  });
}
