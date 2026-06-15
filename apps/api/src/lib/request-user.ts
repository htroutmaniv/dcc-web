import type { FastifyInstance, FastifyRequest } from 'fastify';
import { config } from './config.js';

/** Best-effort user id from the session cookie (no 401 — for rate-limit keys). */
export function getUserIdFromRequest(
  app: FastifyInstance,
  request: FastifyRequest,
): string | undefined {
  const token = request.cookies[config.sessionCookieName];
  if (!token) return undefined;
  try {
    const decoded = app.jwt.verify<{ sub: string }>(token);
    return decoded.sub;
  } catch {
    return undefined;
  }
}

export function normalizeEmailForRateLimit(email: unknown): string | undefined {
  if (typeof email !== 'string') return undefined;
  const normalized = email.trim().toLowerCase();
  return normalized || undefined;
}
