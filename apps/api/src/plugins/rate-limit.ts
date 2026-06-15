import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getUserIdFromRequest, normalizeEmailForRateLimit } from '../lib/request-user.js';

/** Per-client bucket: authenticated users get their own limit; guests use IP. */
export function rateLimitClientKey(app: FastifyInstance, request: FastifyRequest): string {
  const userId = getUserIdFromRequest(app, request);
  if (userId) return `user:${userId}`;
  return `ip:${request.ip}`;
}

/**
 * Paths excluded from the global bucket. Liveness probes and static map images
 * (one fetch per map, cacheable) are exempt; everything else keeps a safety net.
 */
export function shouldSkipGlobalRateLimit(
  _app: FastifyInstance,
  request: FastifyRequest,
): boolean {
  const path = request.url.split('?')[0] ?? request.url;
  if (path === '/health' || path === '/ready') return true;
  if (path.startsWith('/uploads/maps/')) return true;
  return false;
}

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    // Generous per-user cap: a game page load is ~5-10 requests; this leaves
    // ample headroom for active play while still throttling runaway loops.
    max: 600,
    timeWindow: '1 minute',
    hook: 'onRequest',
    keyGenerator: (request) => rateLimitClientKey(app, request),
    allowList: (request) => shouldSkipGlobalRateLimit(app, request),
  });
}

export function createRouteRateLimits(app: FastifyInstance) {
  return {
    register: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    registerDaily: {
      rateLimit: {
        max: 10,
        timeWindow: '1 day',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    resendVerification: {
      rateLimit: {
        max: 1,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => {
          const body = request.body as { email?: string };
          const email = normalizeEmailForRateLimit(body?.email);
          return email ? `resend:${email}` : request.ip;
        },
      },
    },
    forgotPassword: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    forgotPasswordEmail: {
      rateLimit: {
        max: 1,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => {
          const body = request.body as { email?: string };
          const email = normalizeEmailForRateLimit(body?.email);
          return email ? `forgot:${email}` : request.ip;
        },
      },
    },
    resetPassword: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    devLogin: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    joinGame: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => request.ip,
      },
    },
    diceRoll: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (request: import('fastify').FastifyRequest) => {
          const userId = getUserIdFromRequest(app, request);
          return userId ? `dice:${userId}` : request.ip;
        },
      },
    },
  } as const;
}

/** Stack two rate-limit plugins for routes that need IP + account/email buckets. */
export async function registerDualRateLimit(
  app: FastifyInstance,
  limits: Array<{
    max: number;
    timeWindow: number | string;
    keyGenerator?: (request: import('fastify').FastifyRequest) => string;
  }>,
  registerRoutes: (scoped: FastifyInstance) => Promise<void>,
): Promise<void> {
  await app.register(async (scoped) => {
    for (const limit of limits) {
      await scoped.register(rateLimit, {
        max: limit.max,
        timeWindow: limit.timeWindow,
        keyGenerator: limit.keyGenerator ?? ((request) => request.ip),
        hook: 'onRequest',
      });
    }
    await registerRoutes(scoped);
  });
}
