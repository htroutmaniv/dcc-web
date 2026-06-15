import type { FastifyInstance } from 'fastify';
import type { Server } from 'socket.io';
import type { PublishContext } from './game-events.js';
import { config } from './config.js';

export function getUserIdFromSocketCookie(
  app: FastifyInstance,
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = app.parseCookie(cookieHeader);
  const token = cookies[config.sessionCookieName];
  if (!token) return undefined;
  try {
    const decoded = app.jwt.verify<{ sub: string }>(token);
    return decoded.sub;
  } catch {
    return undefined;
  }
}

export function emitToGame(
  io: Server | null | undefined,
  gameId: string,
  event: string,
  payload: Record<string, unknown>,
  ctx?: PublishContext,
): void {
  ctx?.log?.debug({ gameId, event, reqId: ctx.reqId }, 'emit game socket event');
  io?.to(`game:${gameId}`).emit(event, { gameId, ...payload });
}

export function emitToUsers(
  io: Server | null | undefined,
  userIds: Iterable<string>,
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!io) return;
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}
