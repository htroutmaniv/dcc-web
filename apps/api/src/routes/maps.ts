import {
  createGameMapSchema,
  patchGameMapSchema,
  setActiveMapSchema,
  uploadGameMapImageFieldsSchema,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { resolveGameMemberAccess } from '../lib/game-access.js';
import { publish } from '../lib/game-events.js';
import { parseLayoutTokensBody } from '../lib/parse-layout-tokens.js';
import { mapUploadFilePath } from '../lib/storage-paths.js';
import { prisma } from '../lib/prisma.js';
import { gameWithSettingsInclude, readGameSettings } from '../services/game-settings-service.js';
import {
  createGameMap,
  deleteGameMap,
  deleteMapToken,
  ensureCharacterMapToken,
  layoutMapTokens,
  listGameMaps,
  patchGameMap,
  setActiveMapId,
  syncMapTokens,
  uploadGameMapImage,
} from '../services/map-service.js';

const HOLDING_X = -1;
const HOLDING_Y_BASE = 0;

function emitMapState(app: FastifyInstance, gameId: string, actorUserId?: string) {
  publish(app.io, gameId, { type: 'map:updated', actorUserId });
}

export async function mapRoutes(app: FastifyInstance) {
  app.get('/uploads/maps/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (!/^[\w.-]+\.(png|jpg|jpeg|webp)$/i.test(filename)) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = mapUploadFilePath(filename);
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
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      return listGameMaps(gameId);
    },
  );

  app.post(
    '/games/:gameId/maps',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const parsed = createGameMapSchema.safeParse(request.body ?? {});
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const map = await createGameMap(gameId, parsed.data);
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.patch(
    '/games/:gameId/maps/active',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const parsed = setActiveMapSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const activeMapId = await setActiveMapId(gameId, parsed.data.mapId);
      emitMapState(app, gameId, request.userId);
      return { activeMapId };
    },
  );

  app.put(
    '/games/:gameId/maps/:mapId/image',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      let imageBuffer: Buffer | null = null;
      const fields: Record<string, string> = {};

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname !== 'image') {
            return app.httpErrors.badRequest('Unexpected file field');
          }
          imageBuffer = await part.toBuffer();
          continue;
        }
        fields[part.fieldname] = String(part.value);
      }

      if (!imageBuffer) {
        return app.httpErrors.badRequest('Missing image file');
      }

      const parsed = uploadGameMapImageFieldsSchema.safeParse(fields);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      try {
        const map = await uploadGameMapImage(gameId, mapId, imageBuffer, parsed.data);
        emitMapState(app, gameId, request.userId);
        return { map };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        return app.httpErrors.badRequest(msg);
      }
    },
  );

  app.patch(
    '/games/:gameId/maps/:mapId',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
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
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
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
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      const map = await syncMapTokens(gameId, mapId);
      emitMapState(app, gameId, request.userId);
      return { map };
    },
  );

  app.post(
    '/games/:gameId/maps/:mapId/layout-tokens',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
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
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };

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
      publish(app.io, gameId, {
        type: 'map:tokens_reset',
        tokens: updated,
        actorUserId: request.userId,
      });
      emitMapState(app, gameId, request.userId);
      return { tokens: updated };
    },
  );

  app.post(
    '/games/:gameId/map/clear',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const body = (request.body ?? {}) as { clearImage?: boolean };

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
      publish(app.io, gameId, {
        type: 'map:cleared',
        map,
        tokens: map.tokens,
        actorUserId: request.userId,
      });
      emitMapState(app, gameId, request.userId);
      return { map, tokens: map.tokens };
    },
  );

  app.post(
    '/games/:gameId/maps/:mapId/characters/:characterId/token',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId, characterId } = request.params as {
        gameId: string;
        mapId: string;
        characterId: string;
      };
      const token = await ensureCharacterMapToken(gameId, mapId, characterId);
      emitMapState(app, gameId, request.userId);
      return { token };
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
        include: {
          map: { include: { game: { include: gameWithSettingsInclude } } },
          character: true,
        },
      });
      const gameId = token.map.gameId;
      const access = await resolveGameMemberAccess(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);

      const settings = readGameSettings(token.map.game);
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
        publish(app.io, gameId, { type: 'movement:pending', request: req });
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
      publish(app.io, gameId, { type: 'map:token_moved', token: updated });
      return { token: updated };
    },
  );

  app.delete(
    '/tokens/:tokenId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { tokenId } = request.params as { tokenId: string };
      const token = await prisma.mapToken.findUniqueOrThrow({
        where: { id: tokenId },
        include: { map: true },
      });
      const gameId = token.map.gameId;
      const access = await resolveGameMemberAccess(request.userId!, gameId);
      if (!access.ok) throw app.httpErrors.createError(access.status, access.message);
      if (!access.isDm) throw app.httpErrors.forbidden('DM only');

      await deleteMapToken(tokenId, gameId);
      emitMapState(app, gameId, request.userId);
      return { ok: true, tokenId };
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
      const access = await resolveGameMemberAccess(request.userId!, movement.gameId);
      if (!access.ok || !access.isDm) {
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
      publish(app.io, movement.gameId, {
        type: 'movement:resolved',
        request: updatedReq,
        token,
      });
      return { request: updatedReq, token };
    },
  );
}
