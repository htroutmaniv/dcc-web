import {
  createGameSchema,
  parseGameSettings,
  patchGameSettingsSchema,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { syncMonsterGroupInitiative } from '../services/monster-service.js';
import { assertGameMember, generateInviteCode, isGameDm } from '../lib/game-access.js';
import { emitToGame, emitToUsers } from '../lib/game-socket.js';
import { prisma } from '../lib/prisma.js';

const gameListSelect = {
  id: true,
  title: true,
  inviteCode: true,
  dmUserId: true,
  status: true,
  createdAt: true,
} as const;

export async function gameRoutes(app: FastifyInstance) {
  /** Games the user owns (creator/DM) or joined as a player — no other games. */
  app.get('/games', { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.userId!;

    const [owned, joined] = await Promise.all([
      prisma.game.findMany({
        where: { dmUserId: userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: gameListSelect,
      }),
      prisma.game.findMany({
        where: {
          status: 'active',
          players: { some: { userId } },
          dmUserId: { not: userId },
        },
        orderBy: { createdAt: 'desc' },
        select: gameListSelect,
      }),
    ]);

    return {
      games: [
        ...owned.map((game) => ({ game, role: 'dm' as const })),
        ...joined.map((game) => ({ game, role: 'player' as const })),
      ],
    };
  });

  app.post('/games', { onRequest: [app.authenticate] }, async (request) => {
    const parsed = createGameSchema.safeParse(request.body);
    if (!parsed.success) {
      return app.httpErrors.badRequest(parsed.error.message);
    }
    const game = await prisma.game.create({
      data: {
        dmUserId: request.userId!,
        title: parsed.data.title,
        inviteCode: generateInviteCode(),
        maps: { create: { name: 'Main map' } },
      },
      include: { maps: true },
    });
    return { game, role: 'dm' as const };
  });

  app.post('/games/join/:inviteCode', { onRequest: [app.authenticate] }, async (request) => {
    const { inviteCode } = request.params as { inviteCode: string };
    const userId = request.userId!;
    const game = await prisma.game.findUnique({ where: { inviteCode } });
    if (!game) return app.httpErrors.notFound('Invalid invite code');

    if (isGameDm(game, userId)) {
      return { game, role: 'dm' as const };
    }

    const existing = await prisma.gamePlayer.findUnique({
      where: { gameId_userId: { gameId: game.id, userId } },
    });
    if (!existing) {
      await prisma.gamePlayer.create({
        data: { gameId: game.id, userId, role: 'player' },
      });
      emitToGame(app.io, game.id, 'game:roster_changed', { actorUserId: userId });
    }
    return { game, role: 'player' as const };
  });

  app.get('/games/:gameId', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const userId = request.userId!;
    const access = await assertGameMember(userId, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    const game = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      include: {
        dm: { select: { id: true, displayName: true, avatarUrl: true } },
        maps: { include: { tokens: true }, orderBy: { sortOrder: 'asc' } },
        players: { include: { user: true } },
      },
    });
    return {
      game,
      isDm: isGameDm(game, userId),
      role: isGameDm(game, userId) ? ('dm' as const) : ('player' as const),
    };
  });

  app.delete('/games/:gameId', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const userId = request.userId!;
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return app.httpErrors.notFound('Game not found');
    if (!isGameDm(game, userId)) {
      return app.httpErrors.forbidden('Only the game creator can delete this game');
    }
    const members = await prisma.gamePlayer.findMany({
      where: { gameId },
      select: { userId: true },
    });
    const notifyUserIds = new Set([game.dmUserId, ...members.map((m) => m.userId)]);
    const deletedPayload = { gameId, actorUserId: userId };
    emitToUsers(app.io, notifyUserIds, 'game:deleted', deletedPayload);
    await prisma.game.delete({ where: { id: gameId } });
    return { ok: true };
  });

  app.patch('/games/:gameId/settings', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const access = await assertGameMember(request.userId!, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    if (!access.isDm) {
      return app.httpErrors.forbidden('Only the DM can change game settings');
    }

    const parsed = patchGameSettingsSchema.safeParse(request.body);
    if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
    if (Object.keys(parsed.data).length === 0) {
      return app.httpErrors.badRequest('No settings provided');
    }

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    const settings = {
      ...parseGameSettings(game.settings),
      ...parsed.data,
    };
    await prisma.game.update({
      where: { id: gameId },
      data: { settings: settings as object },
    });
    if (parsed.data.sharedMonsterInitiative !== undefined) {
      const initiative = await syncMonsterGroupInitiative(gameId);
      emitToGame(app.io, gameId, 'initiative:updated', {
        initiative,
        actorUserId: request.userId,
      });
    }
    emitToGame(app.io, gameId, 'game:settings_updated', {
      settings,
      actorUserId: request.userId,
    });
    return { settings };
  });
}
