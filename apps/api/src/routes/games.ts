import { createGameSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameMember, generateInviteCode, isGameDm } from '../lib/game-access.js';
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

    await prisma.gamePlayer.upsert({
      where: {
        gameId_userId: { gameId: game.id, userId },
      },
      create: { gameId: game.id, userId, role: 'player' },
      update: {},
    });
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
}
