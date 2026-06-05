import type { FastifyInstance } from 'fastify';
import type { Server } from 'socket.io';
import { config } from './config.js';

export function getUserIdFromSocketCookie(
  app: FastifyInstance,
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  const name = `${config.sessionCookieName}=`;
  const part = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name));
  if (!part) return undefined;
  const token = decodeURIComponent(part.slice(name.length));
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
): void {
  io?.to(`game:${gameId}`).emit(event, { gameId, ...payload });
}
