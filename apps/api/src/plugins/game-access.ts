import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ResolvedGameAccess } from '../lib/game-access.js';
import { resolveGameMemberAccess } from '../lib/game-access.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireMember: (request: FastifyRequest) => Promise<void>;
    requireDm: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    gameAccess?: ResolvedGameAccess;
  }
}

function gameIdFromParams(request: FastifyRequest): string {
  const gameId = (request.params as { gameId?: string }).gameId;
  if (!gameId) {
    throw new Error('requireMember/requireDm routes must declare :gameId param');
  }
  return gameId;
}

export async function registerGameAccess(app: FastifyInstance) {
  app.decorate('requireMember', async function requireMember(request: FastifyRequest) {
    if (!request.userId) {
      throw app.httpErrors.unauthorized('Authentication required');
    }
    const gameId = gameIdFromParams(request);
    const access = await resolveGameMemberAccess(request.userId, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    request.gameAccess = {
      gameId,
      userId: request.userId,
      game: access.game,
      isDm: access.isDm,
    };
  });

  app.decorate('requireDm', async function requireDm(request: FastifyRequest) {
    await app.requireMember(request);
    if (!request.gameAccess!.isDm) {
      throw app.httpErrors.forbidden('DM only');
    }
  });
}
