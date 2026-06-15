import {
  applyDamageSchema,
  diceRollQuerySchema,
  diceRollRequestSchema,
  type GamePatch,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { resolveGameMemberAccess } from '../lib/game-access.js';
import { publish } from '../lib/game-events.js';
import { publishGamePatch } from '../lib/game-patch-publish.js';
import { prisma } from '../lib/prisma.js';
import { applyDamageToTarget, listGameDiceRolls, rollAndPersist } from '../services/dice.js';
import { syncActiveMapTokens } from '../services/map-service.js';
import { getGameMonster } from '../services/monster-service.js';
import {
  addCharacterToInitiativeFromRoll,
  reconcileInitiativeAfterCharacterDeath,
} from '../services/initiative-service.js';

export async function diceRoutes(app: FastifyInstance) {
  app.get(
    '/games/:gameId/dice-rolls',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const parsed = diceRollQuerySchema.safeParse(request.query);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

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

    const access = await resolveGameMemberAccess(request.userId!, parsed.data.gameId);
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
        publishGamePatch(request.server.io, parsed.data.gameId, { initiative }, request.userId);
      }
    }

    publish(request.server.io, parsed.data.gameId, {
      type: 'dice:rolled',
      result,
      actorUserId: request.userId,
      characterId: parsed.data.characterId,
    });

    return { result, initiative };
  });

  app.post(
    '/games/:gameId/apply-damage',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };

      const parsed = applyDamageSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const outcome = await applyDamageToTarget({
        gameId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        amount: parsed.data.amount,
      });

      publish(request.server.io, gameId, {
        type: 'damage:applied',
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        amount: parsed.data.amount,
        hpAfter: outcome.hpAfter,
        targetName: outcome.targetName,
        rollLogId: parsed.data.rollLogId,
        actorUserId: request.userId,
      });

      let character = null;
      let monster = null;
      let initiative = null;
      let map = null;

      if (parsed.data.targetType === 'character') {
        character = await prisma.character.findUnique({
          where: { id: parsed.data.targetId },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (character) {
          if (character.status === 'dead') {
            initiative = await reconcileInitiativeAfterCharacterDeath(gameId);
            map = await syncActiveMapTokens(gameId);
          }
        }
      }

      if (parsed.data.targetType === 'monster') {
        monster = await getGameMonster(gameId, parsed.data.targetId);
        map = await syncActiveMapTokens(gameId);
      }

      const patch: GamePatch = {};
      if (character) patch.characters = { upserted: [character] };
      if (monster) patch.monsters = { upserted: [monster] };
      if (map) patch.map = map;
      if (initiative !== null) patch.initiative = initiative;

      if (parsed.data.targetType === 'npc') {
        const token = await prisma.mapToken.findUnique({ where: { id: parsed.data.targetId } });
        if (token) {
          patch.tokens = { upserted: [token] };
        }
      }

      publishGamePatch(request.server.io, gameId, patch, request.userId);

      return {
        ok: true,
        ...outcome,
        patch,
        ...(character ? { character } : {}),
        ...(monster ? { monster } : {}),
        ...(initiative ? { initiative } : {}),
        ...(map ? { map } : {}),
      };
    },
  );
}
