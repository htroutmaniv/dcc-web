import type { GamePatch } from '@dcc-web/shared';
import { isEmptyGamePatch } from '@dcc-web/shared';
import type { Server } from 'socket.io';
import { publish, type PublishContext } from './game-events.js';

export function publishGamePatch(
  io: Server | null | undefined,
  gameId: string,
  patch: GamePatch,
  actorUserId?: string,
  ctx?: PublishContext,
): void {
  if (isEmptyGamePatch(patch)) return;
  publish(io, gameId, { type: 'game:patch', patch, actorUserId }, ctx);
}
