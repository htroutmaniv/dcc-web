import { createGameSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameMember, generateInviteCode } from '../lib/game-access.js';
import { prisma } from '../lib/prisma.js';

export async function gameRoutes(app: FastifyInstance) {
  app.get('/games', { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.userId!;
    const [asDm, asPlayer] = await Promise.all([
      prisma.game.findMany({
        where: { dmUserId: userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.game.findMany({
        where: { players: { some: { userId } }, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { asDm, asPlayer };
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
        map: { create: {} },
      },
      include: { map: true },
    });
    return { game };
  });

  app.post('/games/join/:inviteCode', { onRequest: [app.authenticate] }, async (request) => {
    const { inviteCode } = request.params as { inviteCode: string };
    const game = await prisma.game.findUnique({ where: { inviteCode } });
    if (!game) return app.httpErrors.notFound('Invalid invite code');
    await prisma.gamePlayer.upsert({
      where: {
        gameId_userId: { gameId: game.id, userId: request.userId! },
      },
      create: { gameId: game.id, userId: request.userId! },
      update: {},
    });
    return { game };
  });

  app.get('/games/:gameId', { onRequest: [app.authenticate] }, async (request) => {
    const { gameId } = request.params as { gameId: string };
    const access = await assertGameMember(request.userId!, gameId);
    if (!access.ok) {
      throw app.httpErrors.createError(access.status, access.message);
    }
    const game = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      include: { map: { include: { tokens: true } }, players: { include: { user: true } } },
    });
    return { game, isDm: access.isDm };
  });
}
