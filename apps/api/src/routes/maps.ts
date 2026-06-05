import {
  createGameMapSchema,
  parseGameSettings,
  patchGameMapSchema,
  setActiveMapSchema,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { assertGameMember } from '../lib/game-access.js';
import { emitToGame } from '../lib/game-socket.js';
import { parseLayoutTokensBody } from '../lib/parse-layout-tokens.js';
import { prisma } from '../lib/prisma.js';
import {
  createGameMap,
  deleteGameMap,
  layoutMapTokens,
  listGameMaps,
  patchGameMap,
  setActiveMapId,
  syncMapTokens,
} from '../services/map-service.js';

const HOLDING_X = -1;
const HOLDING_Y_BASE = 0;
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'maps');

function emitMapState(app: FastifyInstance, gameId: string, actorUserId?: string) {
  emitToGame(app.io, gameId, 'map:updated', { actorUserId });
}

export async function mapRoutes(app: FastifyInstance) {
  app.get('/uploads/maps/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (!/^[\w.-]+\.(png|jpg|jpeg|webp)$/i.test(filename)) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) return reply.status(404).send({ error: 'Not found' });
    const stream = createReadStream(filePath);
    const ext = path.extname(filename).toLowerCase();
    const type =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
    return reply.type(type).send(stream);
  });

  app.get(
    '/games/:gameId/maps',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      return listGameMaps(gameId);
    },
  );

  app.post(
    '/games/:gameId/maps',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');
      const parsed = createGameMapSchema.safeParse(request.body ?? {});
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const map = await createGameMap(gameId, parsed.data);
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.patch(
    '/games/:gameId/maps/active',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      const parsed = setActiveMapSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const activeMapId = await setActiveMapId(gameId, parsed.data.mapId);
      emitMapState(app, gameId, request.userId);
      return { activeMapId };
    },
  );

  app.patch(
    '/games/:gameId/maps/:mapId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');
      const parsed = patchGameMapSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const map = await patchGameMap(gameId, mapId, {
        ...parsed.data,
        dmDrawings: parsed.data.dmDrawings as never,
      });
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.delete(
    '/games/:gameId/maps/:mapId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');
      try {
        const { activeMapId } = await deleteGameMap(gameId, mapId);
        emitMapState(app, gameId, request.userId);
        return { ok: true, activeMapId };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Delete failed';
        return app.httpErrors.badRequest(msg);
      }
    },
  );

  app.post(
    '/games/:gameId/maps/:mapId/sync-tokens',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');
      const map = await syncMapTokens(gameId, mapId);
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.post(
    '/games/:gameId/maps/:mapId/layout-tokens',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');
      const map = await layoutMapTokens(
        gameId,
        mapId,
        parseLayoutTokensBody(request.body ?? {}),
      );
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.post(
    '/games/:gameId/map/reset-tokens',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');

      const { activeMapId } = await listGameMaps(gameId);
      if (!activeMapId) return { tokens: [] };
      const tokens = await prisma.mapToken.findMany({ where: { mapId: activeMapId } });
      let i = 0;
      for (const token of tokens) {
        await prisma.mapToken.update({
          where: { id: token.id },
          data: { zone: 'holding', x: HOLDING_X, y: HOLDING_Y_BASE + i },
        });
        i += 1;
      }
      const updated = await prisma.mapToken.findMany({ where: { mapId: activeMapId } });
      emitToGame(app.io, gameId, 'map:tokens_reset', { tokens: updated });
      emitMapState(app, gameId, request.userId);
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

      const { activeMapId } = await listGameMaps(gameId);
      if (!activeMapId) return { map: null, tokens: [] };
      const map = await patchGameMap(gameId, activeMapId, {
        dmDrawings: [],
        clearImage: body.clearImage,
      });
      await prisma.mapToken.updateMany({
        where: { mapId: activeMapId },
        data: { zone: 'holding', x: HOLDING_X, y: 0 },
      });
      emitToGame(app.io, gameId, 'map:cleared', { map, tokens: map.tokens });
      emitMapState(app, gameId, request.userId);
      return { map, tokens: map.tokens };
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
        token.kind === 'pc' && token.character?.ownerUserId === request.userId;

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
        emitToGame(app.io, gameId, 'movement:pending', { request: req });
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
      emitToGame(app.io, gameId, 'map:token_moved', { token: updated });
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
      emitToGame(app.io, movement.gameId, 'movement:resolved', { request: updatedReq, token });
      return { request: updatedReq, token };
    },
  );
}
