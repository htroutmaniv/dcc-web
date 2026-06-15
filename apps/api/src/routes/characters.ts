import {
  createCharacterSchema,
  generateCharacterSchema,
  patchCharacterSchema,
  replaceCharacterItemsSchema,
  warnUnknownCharacterStatsCustomKeys,
} from '@dcc-web/shared';
import type { CharacterStats } from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { assertGameMember } from '../lib/game-access.js';
import { prisma } from '../lib/prisma.js';
import {
  createManualCharacterData,
  generateRandomCharacterData,
} from '../services/character-generator.js';
import { applyCharacterStatus } from '../services/character-status.js';
import { mergeCharacterCombatWithMortality } from '../services/character-combat.js';
import { characterMovementRange } from '../services/movement.js';
import { deleteTokensForCharacter, syncActiveMapTokens } from '../services/map-service.js';
import { reconcileInitiativeAfterCharacterDeath } from '../services/initiative-service.js';
import { emitToGame } from '../lib/game-socket.js';

function broadcastCharacter(
  request: { server: { io: import('socket.io').Server | null }; userId?: string },
  gameId: string,
  character: Awaited<ReturnType<typeof prisma.character.create>>,
) {
  emitToGame(request.server.io, gameId, 'character:upsert', {
    character,
    actorUserId: request.userId,
  });
}

async function assertValidCharacterOwner(
  gameId: string,
  dmUserId: string,
  ownerUserId: string,
) {
  if (ownerUserId === dmUserId) return;
  const member = await prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId: ownerUserId } },
  });
  if (!member) {
    throw new Error('Owner must be the DM or a player in this game');
  }
}

export async function characterRoutes(app: FastifyInstance) {
  app.get(
    '/games/:gameId/characters',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const { status, includeDead } = request.query as {
        status?: string;
        includeDead?: string;
      };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);

      const where: {
        gameId: string;
        ownerUserId?: string;
        status?: 'alive' | 'dead' | 'archived' | { in: ('alive' | 'dead')[] };
      } = { gameId };
      if (!access.isDm) where.ownerUserId = request.userId!;
      if (status === 'alive' || status === 'dead' || status === 'archived') {
        where.status = status;
      } else if (includeDead === 'true' && access.isDm) {
        where.status = { in: ['alive', 'dead'] };
      } else {
        where.status = 'alive';
      }

      const characters = await prisma.character.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { characters };
    },
  );

  async function persistCharacter(
    gameId: string,
    ownerUserId: string,
    generated: ReturnType<typeof generateRandomCharacterData>,
    source: 'random' | 'manual',
  ) {
    return prisma.character.create({
      data: {
        gameId,
        ownerUserId,
        name: generated.name,
        className: generated.className,
        level: generated.level,
        alignment: generated.alignment,
        notes: generated.notes,
        stats: generated.stats as unknown as Prisma.InputJsonValue,
        combat: generated.combat as unknown as Prisma.InputJsonValue,
        source,
        items: {
          create: generated.items.map((item, i) => ({
            category: item.category,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes ?? '',
            properties: (item.properties ?? {}) as Prisma.InputJsonValue,
            sortOrder: i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  app.post(
    '/games/:gameId/characters',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);

      const parsed = createCharacterSchema.safeParse(request.body ?? {});
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const ownerUserId =
        access.isDm && parsed.data.ownerUserId
          ? parsed.data.ownerUserId
          : request.userId!;

      if (access.isDm && parsed.data.ownerUserId) {
        try {
          await assertValidCharacterOwner(
            gameId,
            access.game.dmUserId,
            parsed.data.ownerUserId,
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Invalid character owner';
          throw app.httpErrors.badRequest(message);
        }
      }

      try {
        if (parsed.data.mode === 'random') {
          const generated = generateRandomCharacterData({
            level: parsed.data.level,
            className: parsed.data.className,
            noElves: parsed.data.noElves,
            noDwarves: parsed.data.noDwarves,
            noHalflings: parsed.data.noHalflings,
          });
          const character = await persistCharacter(gameId, ownerUserId, generated, 'random');
          await syncActiveMapTokens(gameId);
          broadcastCharacter(request, gameId, character);
          emitToGame(request.server.io, gameId, 'map:updated', { actorUserId: request.userId });
          return { character };
        }

        const generated = createManualCharacterData({
          level: parsed.data.level,
          className: parsed.data.className,
          name: parsed.data.name,
        });
        const character = await persistCharacter(gameId, ownerUserId, generated, 'manual');
        await syncActiveMapTokens(gameId);
        broadcastCharacter(request, gameId, character);
        emitToGame(request.server.io, gameId, 'map:updated', { actorUserId: request.userId });
        return { character };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Character creation failed';
        throw app.httpErrors.badRequest(message);
      }
    },
  );

  /** @deprecated Prefer POST /games/:gameId/characters with mode "random" */
  app.post(
    '/games/:gameId/characters/generate',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);

      const parsed = generateCharacterSchema.safeParse(request.body ?? {});
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const ownerUserId =
        access.isDm && parsed.data.ownerUserId
          ? parsed.data.ownerUserId
          : request.userId!;
      try {
        const generated = generateRandomCharacterData({
          level: parsed.data.level,
          className: parsed.data.className,
          noElves: parsed.data.noElves,
          noDwarves: parsed.data.noDwarves,
          noHalflings: parsed.data.noHalflings,
        });
        const character = await persistCharacter(gameId, ownerUserId, generated, 'random');
        broadcastCharacter(request, gameId, character);
        return { character };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Character generation failed';
        throw app.httpErrors.badRequest(message);
      }
    },
  );

  app.patch(
    '/characters/:characterId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { characterId } = request.params as { characterId: string };
      const parsed = patchCharacterSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      warnUnknownCharacterStatsCustomKeys(
        parsed.data.stats?.custom as Record<string, unknown> | undefined,
        request.log,
      );

      const existing = await prisma.character.findUniqueOrThrow({
        where: { id: characterId },
      });
      const access = await assertGameMember(request.userId!, existing.gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm && existing.ownerUserId !== request.userId!) {
        throw app.httpErrors.forbidden('Cannot edit another player\'s character');
      }
      if (!access.isDm && parsed.data.status !== undefined) {
        throw app.httpErrors.forbidden('Only the DM can change character status');
      }
      if (!access.isDm && parsed.data.ownerUserId !== undefined) {
        throw app.httpErrors.forbidden('Only the DM can assign character ownership');
      }

      const statusChange =
        access.isDm && parsed.data.status !== undefined ? parsed.data.status : undefined;

      const ownerChange =
        access.isDm && parsed.data.ownerUserId !== undefined
          ? parsed.data.ownerUserId
          : undefined;

      if (ownerChange !== undefined) {
        try {
          await assertValidCharacterOwner(
            existing.gameId,
            access.game.dmUserId,
            ownerChange,
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Invalid character owner';
          throw app.httpErrors.badRequest(message);
        }
      }

      const hasOtherFields =
        parsed.data.name !== undefined ||
        parsed.data.level !== undefined ||
        parsed.data.className !== undefined ||
        parsed.data.alignment !== undefined ||
        parsed.data.notes !== undefined ||
        parsed.data.ownerUserId !== undefined ||
        parsed.data.stats !== undefined ||
        parsed.data.combat !== undefined ||
        parsed.data.items !== undefined;

      let hpMarkDead = false;
      const character = await prisma.$transaction(async (tx) => {
        if (parsed.data.items) {
          await tx.characterItem.deleteMany({ where: { characterId } });
        }

        if (statusChange) {
          try {
            await applyCharacterStatus(tx, characterId, statusChange, {
              bumpVersion: !hasOtherFields,
            });
          } catch (e) {
            if (
              e instanceof Error &&
              e.message === 'CHARACTER_ARCHIVE_MIGRATION_REQUIRED'
            ) {
              throw app.httpErrors.badRequest(
                'Archive requires a database migration. Run: bun run db:migrate',
              );
            }
            throw e;
          }
        }

        if (!hasOtherFields && !statusChange) {
          throw app.httpErrors.badRequest('No changes provided');
        }

        let combatUpdate: Record<string, unknown> | undefined;
        if (parsed.data.combat !== undefined) {
          const merged = mergeCharacterCombatWithMortality(
            existing,
            parsed.data.combat as Record<string, unknown>,
          );
          combatUpdate = merged.combat;
          hpMarkDead = merged.markDead;
        }

        if (hpMarkDead && existing.status !== 'dead') {
          await applyCharacterStatus(tx, characterId, 'dead', { bumpVersion: false });
        }

        if (!hasOtherFields) {
          return tx.character.findUniqueOrThrow({
            where: { id: characterId },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
          });
        }

        return tx.character.update({
          where: { id: characterId },
          data: {
            ...(parsed.data.name !== undefined && { name: parsed.data.name }),
            ...(parsed.data.level !== undefined && { level: parsed.data.level }),
            ...(parsed.data.className !== undefined && { className: parsed.data.className }),
            ...(parsed.data.alignment !== undefined && { alignment: parsed.data.alignment }),
            ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
            ...(ownerChange !== undefined && { ownerUserId: ownerChange }),
            ...(parsed.data.stats !== undefined && {
              stats: parsed.data.stats as Prisma.InputJsonValue,
            }),
            ...(combatUpdate !== undefined && {
              combat: combatUpdate as Prisma.InputJsonValue,
            }),
            ...(parsed.data.items && {
              items: {
                create: parsed.data.items.map((item, i) => ({
                  category: item.category,
                  name: item.name,
                  quantity: item.quantity ?? 1,
                  notes: item.notes ?? '',
                  properties: (item.properties ?? {}) as Prisma.InputJsonValue,
                  sortOrder: i,
                })),
              },
            }),
            version: { increment: 1 },
          },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      if (statusChange === 'archived') {
        await deleteTokensForCharacter(characterId);
        emitToGame(request.server.io, existing.gameId, 'map:updated', {
          actorUserId: request.userId,
        });
      } else if (
        statusChange === 'dead' ||
        statusChange === 'alive' ||
        hpMarkDead
      ) {
        await syncActiveMapTokens(existing.gameId);
        emitToGame(request.server.io, existing.gameId, 'map:updated', {
          actorUserId: request.userId,
        });
      }
      if (statusChange === 'dead' || hpMarkDead) {
        const initiative = await reconcileInitiativeAfterCharacterDeath(existing.gameId);
        if (initiative) {
          emitToGame(request.server.io, existing.gameId, 'initiative:updated', {
            initiative,
            actorUserId: request.userId,
          });
        }
      }
      broadcastCharacter(request, existing.gameId, character);
      return { character };
    },
  );

  app.put(
    '/characters/:characterId/items',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { characterId } = request.params as { characterId: string };
      const parsed = replaceCharacterItemsSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const existing = await prisma.character.findUniqueOrThrow({
        where: { id: characterId },
      });
      const access = await assertGameMember(request.userId!, existing.gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm && existing.ownerUserId !== request.userId!) {
        throw app.httpErrors.forbidden('Cannot edit another player\'s character');
      }

      const character = await prisma.$transaction(async (tx) => {
        const existing = await tx.characterItem.findMany({ where: { characterId } });
        const existingIds = new Set(existing.map((row) => row.id));
        const idsToKeep = parsed.data.items
          .map((item) => item.id)
          .filter((id): id is string => typeof id === 'string' && existingIds.has(id));

        if (idsToKeep.length > 0) {
          await tx.characterItem.deleteMany({
            where: { characterId, id: { notIn: idsToKeep } },
          });
        } else {
          await tx.characterItem.deleteMany({ where: { characterId } });
        }

        for (let i = 0; i < parsed.data.items.length; i++) {
          const item = parsed.data.items[i]!;
          const data = {
            category: item.category,
            name: item.name,
            quantity: item.quantity ?? 1,
            notes: item.notes ?? '',
            properties: (item.properties ?? {}) as Prisma.InputJsonValue,
            sortOrder: i,
          };
          if (item.id && existingIds.has(item.id)) {
            await tx.characterItem.update({
              where: { id: item.id, characterId },
              data,
            });
          } else {
            await tx.characterItem.create({
              data: { characterId, ...data },
            });
          }
        }

        return tx.character.update({
          where: { id: characterId },
          data: { version: { increment: 1 } },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      broadcastCharacter(request, existing.gameId, character);
      return { character };
    },
  );

  app.get(
    '/characters/:characterId/movement-range',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { characterId } = request.params as { characterId: string };
      const character = await prisma.character.findUniqueOrThrow({
        where: { id: characterId },
        include: { game: true },
      });
      const access = await assertGameMember(request.userId!, character.gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm && character.ownerUserId !== request.userId!) {
        throw app.httpErrors.forbidden();
      }
      const range = characterMovementRange(character.stats, character.game);
      return { range, stats: character.stats as unknown as CharacterStats };
    },
  );
}
