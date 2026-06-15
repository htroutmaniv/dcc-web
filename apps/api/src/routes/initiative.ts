import { initiativeEndTurnSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { publish, publishMany } from '../lib/game-events.js';
import { prisma } from '../lib/prisma.js';
import {
  advanceGameInitiative,
  endCharacterTurn,
  endGameInitiative,
  getInitiativeForGame,
  startGameInitiative,
} from '../services/initiative-service.js';
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
    publish(app.io, gameId, {
      type: 'character:upsert',
      character,
      actorUserId,
    });
  }
  await syncActiveMapTokens(gameId);
  publish(app.io, gameId, { type: 'map:updated', actorUserId });
}

export async function initiativeRoutes(app: FastifyInstance) {
  app.get(
    '/games/:gameId/initiative',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      return { initiative: await getInitiativeForGame(gameId) };
    },
  );

  app.post(
    '/games/:gameId/initiative/start',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const initiative = await startGameInitiative(gameId);
      await syncActiveMapTokens(gameId);
      publishMany(app.io, gameId, [
        { type: 'initiative:updated', initiative, actorUserId: request.userId },
        { type: 'map:updated', actorUserId: request.userId },
      ]);
      return { initiative };
    },
  );

  app.post(
    '/games/:gameId/initiative/advance',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const { initiative, mortalityUpdates } = await advanceGameInitiative(gameId);
      publish(app.io, gameId, {
        type: 'initiative:updated',
        initiative,
        actorUserId: request.userId,
      });
      await broadcastMortalityUpdates(app, gameId, mortalityUpdates, request.userId);
      return { initiative };
    },
  );

  app.post(
    '/games/:gameId/initiative/end',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      await endGameInitiative(gameId);
      publish(app.io, gameId, {
        type: 'initiative:updated',
        initiative: null,
        actorUserId: request.userId,
      });
      return { initiative: null };
    },
  );

  app.post(
    '/games/:gameId/initiative/end-turn',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = request.gameAccess!;
      const parsed = initiativeEndTurnSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return app.httpErrors.badRequest(parsed.error.message);
      }
      try {
        const { initiative, mortalityUpdates } = await endCharacterTurn({
          gameId,
          userId: access.userId,
          isDm: access.isDm,
          characterId: parsed.data.characterId,
        });
        publish(app.io, gameId, {
          type: 'initiative:updated',
          initiative,
          actorUserId: request.userId,
        });
        await broadcastMortalityUpdates(app, gameId, mortalityUpdates, request.userId);
        return { initiative };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Cannot end turn';
        return app.httpErrors.badRequest(message);
      }
    },
  );
}
