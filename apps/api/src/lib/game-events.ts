import type { GameEvent } from '@dcc-web/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Server } from 'socket.io';
import { emitToGame } from './game-socket.js';

export type PublishContext = {
  log?: FastifyBaseLogger;
  reqId?: string;
};

export function publishContextFromRequest(request: {
  log: FastifyBaseLogger;
  id: string;
}): PublishContext {
  return { log: request.log, reqId: request.id };
}

export function publish(
  io: Server | null | undefined,
  gameId: string,
  event: GameEvent,
  ctx?: PublishContext,
): void {
  const { type, ...payload } = event;
  ctx?.log?.debug({ gameId, event: type, reqId: ctx.reqId }, 'publish game event');
  emitToGame(io, gameId, type, payload as Record<string, unknown>, ctx);
}

export function publishMany(
  io: Server | null | undefined,
  gameId: string,
  events: GameEvent[],
  ctx?: PublishContext,
): void {
  for (const event of events) {
    publish(io, gameId, event, ctx);
  }
}
