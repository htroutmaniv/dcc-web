import {
  applyDamageSchema,
  diceRollQuerySchema,
  diceRollRequestSchema,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameDm } from '../lib/assert-game-dm.js';
import { assertGameMember } from '../lib/game-access.js';
import { emitToGame } from '../lib/game-socket.js';
import { prisma } from '../lib/prisma.js';
import { applyDamageToTarget, listGameDiceRolls, rollAndPersist } from '../services/dice.js';
import {
  addCharacterToInitiativeFromRoll,
  reconcileInitiativeAfterCharacterDeath,
} from '../services/initiative-service.js';

export async function diceRoutes(app: FastifyInstance) {
  app.get(
    '/games/:gameId/dice-rolls',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const parsed = diceRollQuerySchema.safeParse(request.query);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }

      const rolls = await listGameDiceRolls(gameId, parsed.data.limit);
      return { rolls };
    },
  );

  app.post('/dice/roll', {
    onRequest: [app.authenticate],
    config: app.routeRateLimits.diceRoll,
  }, async (request) => {
    const parsed = diceRollRequestSchema.safeParse(request.body);
    if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

    const access = await assertGameMember(request.userId!, parsed.data.gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }

    const result = await rollAndPersist({
      gameId: parsed.data.gameId,
      userId: request.userId!,
      characterId: parsed.data.characterId,
      notation: parsed.data.notation,
      reason: parsed.data.reason,
      rollKind: parsed.data.rollKind,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    });

    let initiative = null;
    if (parsed.data.rollKind === 'initiative' && parsed.data.characterId) {
      initiative = await addCharacterToInitiativeFromRoll({
        gameId: parsed.data.gameId,
        characterId: parsed.data.characterId,
        initiative: result.total,
        d20Roll: result.rolls[0] ?? result.total,
        modifier: result.modifier,
      });
      if (initiative) {
        emitToGame(request.server.io, parsed.data.gameId, 'initiative:updated', {
          initiative,
          actorUserId: request.userId,
        });
      }
    }

    emitToGame(request.server.io, parsed.data.gameId, 'dice:rolled', {
      result,
      actorUserId: request.userId,
      characterId: parsed.data.characterId,
    });

    return { result, initiative };
  });

  app.post(
    '/games/:gameId/apply-damage',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }

      const parsed = applyDamageSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const outcome = await applyDamageToTarget({
        gameId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        amount: parsed.data.amount,
      });

      emitToGame(request.server.io, gameId, 'damage:applied', {
        ...outcome,
        amount: parsed.data.amount,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        rollLogId: parsed.data.rollLogId,
        actorUserId: request.userId,
      });

      if (parsed.data.targetType === 'character') {
        const character = await prisma.character.findUnique({
          where: { id: parsed.data.targetId },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (character) {
          emitToGame(request.server.io, gameId, 'character:upsert', {
            character,
            actorUserId: request.userId,
          });
          if (character.status === 'dead') {
            const initiative = await reconcileInitiativeAfterCharacterDeath(gameId);
            if (initiative) {
              emitToGame(request.server.io, gameId, 'initiative:updated', {
                initiative,
                actorUserId: request.userId,
              });
            }
          }
        }
      }

      if (parsed.data.targetType === 'monster') {
        emitToGame(request.server.io, gameId, 'monsters:changed', {
          actorUserId: request.userId,
        });
      }

      if (parsed.data.targetType === 'npc') {
        const token = await prisma.mapToken.findUnique({ where: { id: parsed.data.targetId } });
        if (token) {
          emitToGame(request.server.io, gameId, 'token:updated', {
            token,
            actorUserId: request.userId,
          });
        }
      }

      return { ok: true, ...outcome };
    },
  );
}
