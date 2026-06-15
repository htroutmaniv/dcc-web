import { initiativeEndTurnSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameDm } from '../lib/assert-game-dm.js';
import { assertGameMember } from '../lib/game-access.js';
import { prisma } from '../lib/prisma.js';
import {
  advanceGameInitiative,
  endCharacterTurn,
  endGameInitiative,
  getInitiativeForGame,
  startGameInitiative,
} from '../services/initiative-service.js';
import { emitToGame } from '../lib/game-socket.js';
import { syncActiveMapTokens } from '../services/map-service.js';

async function broadcastMortalityUpdates(
  app: FastifyInstance,
  gameId: string,
  characterIds: string[],
  actorUserId?: string,
) {
  if (characterIds.length === 0) return;
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  for (const character of characters) {
    emitToGame(app.io, gameId, 'character:upsert', { character, actorUserId });
  }
  await syncActiveMapTokens(gameId);
  emitToGame(app.io, gameId, 'map:updated', { actorUserId });
}

function emitInitiativeUpdate(
  app: FastifyInstance,
  gameId: string,
  initiative: Awaited<ReturnType<typeof getInitiativeForGame>>,
  actorUserId?: string,
) {
  emitToGame(app.io, gameId, 'initiative:updated', { initiative, actorUserId });
}

export async function initiativeRoutes(app: FastifyInstance) {
  app.get('/games/:gameId/initiative', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const access = await assertGameMember(request.userId!, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    return { initiative: await getInitiativeForGame(gameId) };
  });

  app.post(
    '/games/:gameId/initiative/start',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const initiative = await startGameInitiative(gameId);
      await syncActiveMapTokens(gameId);
      emitInitiativeUpdate(app, gameId, initiative, request.userId);
      emitToGame(app.io, gameId, 'map:updated', { actorUserId: request.userId });
      return { initiative };
    },
  );

  app.post(
    '/games/:gameId/initiative/advance',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const { initiative, mortalityUpdates } = await advanceGameInitiative(gameId);
      emitInitiativeUpdate(app, gameId, initiative, request.userId);
      await broadcastMortalityUpdates(app, gameId, mortalityUpdates, request.userId);
      return { initiative };
    },
  );

  app.post(
    '/games/:gameId/initiative/end',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      await endGameInitiative(gameId);
      emitInitiativeUpdate(app, gameId, null, request.userId);
      return { initiative: null };
    },
  );

  app.post(
    '/games/:gameId/initiative/end-turn',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const parsed = initiativeEndTurnSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return app.httpErrors.badRequest(parsed.error.message);
      }
      try {
        const { initiative, mortalityUpdates } = await endCharacterTurn({
          gameId,
          userId: request.userId!,
          isDm: access.isDm,
          characterId: parsed.data.characterId,
        });
        emitInitiativeUpdate(app, gameId, initiative, request.userId);
        await broadcastMortalityUpdates(app, gameId, mortalityUpdates, request.userId);
        return { initiative };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Cannot end turn';
        return app.httpErrors.badRequest(message);
      }
    },
  );
}
