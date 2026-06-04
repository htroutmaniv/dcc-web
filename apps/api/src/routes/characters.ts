import { generateCharacterSchema, patchCharacterSchema } from '@dcc-web/shared';
import type { CharacterStats } from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { assertGameMember } from '../lib/game-access.js';
import { prisma } from '../lib/prisma.js';
import { generateRandomCharacterData } from '../services/character-generator.js';
import { characterMovementRange } from '../services/movement.js';

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
        status?: 'alive' | 'dead';
      } = { gameId };
      if (!access.isDm) where.ownerUserId = request.userId!;
      if (status === 'alive' || status === 'dead') where.status = status;
      else if (includeDead !== 'true') where.status = 'alive';

      const characters = await prisma.character.findMany({
        where,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      });
      return { characters };
    },
  );

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
      const generated = generateRandomCharacterData(parsed.data.level);
      const character = await prisma.character.create({
        data: {
          gameId,
          ownerUserId,
          name: generated.name,
          className: generated.className,
          level: generated.level,
          stats: generated.stats as unknown as Prisma.InputJsonValue,
          combat: generated.combat as unknown as Prisma.InputJsonValue,
          source: 'random',
        },
      });
      return { character };
    },
  );

  app.patch(
    '/characters/:characterId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { characterId } = request.params as { characterId: string };
      const parsed = patchCharacterSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const existing = await prisma.character.findUniqueOrThrow({
        where: { id: characterId },
      });
      const access = await assertGameMember(request.userId!, existing.gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm && existing.ownerUserId !== request.userId!) {
        throw app.httpErrors.forbidden('Cannot edit another player\'s character');
      }
      if (!access.isDm && (parsed.data.stats || parsed.data.combat || parsed.data.status)) {
        throw app.httpErrors.forbidden('Only the DM can modify stats, combat, or status');
      }

      const character = await prisma.character.update({
        where: { id: characterId },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.level !== undefined && { level: parsed.data.level }),
          ...(parsed.data.className !== undefined && { className: parsed.data.className }),
          ...(parsed.data.alignment !== undefined && { alignment: parsed.data.alignment }),
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
          ...(access.isDm &&
            parsed.data.stats !== undefined && {
              stats: parsed.data.stats as Prisma.InputJsonValue,
            }),
          ...(access.isDm &&
            parsed.data.combat !== undefined && {
              combat: parsed.data.combat as Prisma.InputJsonValue,
            }),
          ...(access.isDm && parsed.data.status !== undefined && {
            status: parsed.data.status,
            diedAt: parsed.data.status === 'dead' ? new Date() : null,
          }),
          version: { increment: 1 },
        },
      });
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
