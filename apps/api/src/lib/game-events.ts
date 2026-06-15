import type { GameEvent } from '@dcc-web/shared';
import type { Server } from 'socket.io';
import { emitToGame } from './game-socket.js';

export function publish(
  io: Server | null | undefined,
  gameId: string,
  event: GameEvent,
): void {
  const { type, ...payload } = event;
  emitToGame(io, gameId, type, payload as Record<string, unknown>);
}

export function publishMany(
  io: Server | null | undefined,
  gameId: string,
  events: GameEvent[],
): void {
  for (const event of events) {
    publish(io, gameId, event);
  }
}
