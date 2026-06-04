import { parseGameSettings } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameMember } from '../lib/game-access.js';
import { prisma } from '../lib/prisma.js';

const HOLDING_X = -1;
const HOLDING_Y_BASE = 0;

export async function mapRoutes(app: FastifyInstance) {
  app.post(
    '/games/:gameId/map/reset-tokens',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');

      const map = await prisma.gameMap.findUniqueOrThrow({ where: { gameId } });
      const tokens = await prisma.mapToken.findMany({ where: { mapId: map.id } });
      let i = 0;
      for (const token of tokens) {
        await prisma.mapToken.update({
          where: { id: token.id },
          data: {
            zone: 'holding',
            x: HOLDING_X,
            y: HOLDING_Y_BASE + i,
          },
        });
        i += 1;
      }
      const updated = await prisma.mapToken.findMany({ where: { mapId: map.id } });
      request.server.io?.to(`game:${gameId}`).emit('map:tokens_reset', { tokens: updated });
      return { tokens: updated };
    },
  );

  app.post(
    '/games/:gameId/map/clear',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const body = (request.body ?? {}) as { clearImage?: boolean };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');

      const map = await prisma.gameMap.update({
        where: { gameId },
        data: {
          dmDrawings: [],
          ...(body.clearImage ? { imageUrl: null, widthPx: 0, heightPx: 0 } : {}),
        },
      });
      await prisma.mapToken.updateMany({
        where: { mapId: map.id },
        data: { zone: 'holding', x: HOLDING_X, y: 0 },
      });
      const tokens = await prisma.mapToken.findMany({ where: { mapId: map.id } });
      request.server.io?.to(`game:${gameId}`).emit('map:cleared', { map, tokens });
      return { map, tokens };
    },
  );

  app.patch(
    '/tokens/:tokenId/move',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { tokenId } = request.params as { tokenId: string };
      const body = request.body as { x: number; y: number; zone?: 'map' | 'holding' };

      const token = await prisma.mapToken.findUniqueOrThrow({
        where: { id: tokenId },
        include: { map: { include: { game: true } }, character: true },
      });
      const gameId = token.map.gameId;
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);

      const settings = parseGameSettings(token.map.game.settings);
      const isPcOwnedByPlayer =
        token.kind === 'pc' &&
        token.character?.ownerUserId === request.userId;

      if (!access.isDm && !isPcOwnedByPlayer) {
        throw app.httpErrors.forbidden('Cannot move this token');
      }

      if (!access.isDm && settings.playerTokenMovement === 'approval') {
        const req = await prisma.movementRequest.create({
          data: {
            gameId,
            tokenId,
            requesterId: request.userId!,
            targetX: body.x,
            targetY: body.y,
            targetZone: body.zone ?? 'map',
          },
        });
        request.server.io?.to(`game:${gameId}`).emit('movement:pending', { request: req });
        return { pending: true, request: req };
      }

      const updated = await prisma.mapToken.update({
        where: { id: tokenId },
        data: {
          x: body.x,
          y: body.y,
          zone: body.zone ?? 'map',
        },
      });
      request.server.io?.to(`game:${gameId}`).emit('map:token_moved', { token: updated });
      return { token: updated };
    },
  );

  app.post(
    '/movement-requests/:id/resolve',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { accept } = request.body as { accept: boolean };

      const movement = await prisma.movementRequest.findUniqueOrThrow({
        where: { id },
      });
      const gameAccess = await assertGameMember(request.userId!, movement.gameId);
      if (!gameAccess.ok || !gameAccess.isDm) {
        throw app.httpErrors.forbidden('DM only');
      }

      const status = accept ? 'accepted' : 'rejected';
      const updatedReq = await prisma.movementRequest.update({
        where: { id },
        data: { status, resolvedAt: new Date() },
      });

      let token = null;
      if (accept) {
        token = await prisma.mapToken.update({
          where: { id: movement.tokenId },
          data: {
            x: movement.targetX,
            y: movement.targetY,
            zone: movement.targetZone,
          },
        });
      }
      request.server.io
        ?.to(`game:${movement.gameId}`)
        .emit('movement:resolved', { request: updatedReq, token });
      return { request: updatedReq, token };
    },
  );
}
