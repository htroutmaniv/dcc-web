import { initiativeEndTurnSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameDm } from '../lib/assert-game-dm.js';
import { assertGameMember } from '../lib/game-access.js';
import {
  advanceGameInitiative,
  endCharacterTurn,
  endGameInitiative,
  getInitiativeFromGame,
  startGameInitiative,
} from '../services/initiative-service.js';
import { prisma } from '../lib/prisma.js';

function emitInitiativeUpdate(
  app: FastifyInstance,
  gameId: string,
  initiative: ReturnType<typeof getInitiativeFromGame>,
) {
  app.io?.to(`game:${gameId}`).emit('initiative:updated', { gameId, initiative });
}

export async function initiativeRoutes(app: FastifyInstance) {
  app.get('/games/:gameId/initiative', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const access = await assertGameMember(request.userId!, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    return { initiative: getInitiativeFromGame(game.settings) };
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
      emitInitiativeUpdate(app, gameId, initiative);
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
      const initiative = await advanceGameInitiative(gameId);
      emitInitiativeUpdate(app, gameId, initiative);
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
      emitInitiativeUpdate(app, gameId, null);
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
        const initiative = await endCharacterTurn({
          gameId,
          userId: request.userId!,
          isDm: access.isDm,
          characterId: parsed.data.characterId,
        });
        emitInitiativeUpdate(app, gameId, initiative);
        return { initiative };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Cannot end turn';
        return app.httpErrors.badRequest(message);
      }
    },
  );
}
