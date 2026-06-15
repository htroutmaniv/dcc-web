import { initiativeEndTurnSchema, type GamePatch } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { publishGamePatch } from '../lib/game-patch-publish.js';
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
  const map = await syncActiveMapTokens(gameId);
  const patch: GamePatch = {
    characters: { upserted: characters },
    ...(map ? { map } : {}),
  };
  publishGamePatch(app.io, gameId, patch, actorUserId);
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
      const map = await syncActiveMapTokens(gameId);
      const patch: GamePatch = {
        initiative,
        ...(map ? { map } : {}),
      };
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { initiative, patch };
    },
  );

  app.post(
    '/games/:gameId/initiative/advance',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const { initiative, mortalityUpdates } = await advanceGameInitiative(gameId);
      publishGamePatch(app.io, gameId, { initiative }, request.userId);
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
      const patch: GamePatch = { initiative: null };
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { initiative: null, patch };
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
        publishGamePatch(app.io, gameId, { initiative }, request.userId);
        await broadcastMortalityUpdates(app, gameId, mortalityUpdates, request.userId);
        return { initiative };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Cannot end turn';
        return app.httpErrors.badRequest(message);
      }
    },
  );
}
