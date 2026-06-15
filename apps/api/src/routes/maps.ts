import {
  createGameMapSchema,
  patchGameMapSchema,
  setActiveMapSchema,
  uploadGameMapImageFieldsSchema,
  type GamePatch,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { resolveGameMemberAccess } from '../lib/game-access.js';
import { publish, publishContextFromRequest } from '../lib/game-events.js';
import { publishGamePatch } from '../lib/game-patch-publish.js';
import { AUDIT_KINDS, recordAudit } from '../services/audit-service.js';
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
import type { GameMapDto } from '../services/map-service.js';

const HOLDING_X = -1;
const HOLDING_Y_BASE = 0;

function publishMapPatch(
  app: FastifyInstance,
  gameId: string,
  map: GameMapDto,
  actorUserId?: string,
  ctx?: ReturnType<typeof publishContextFromRequest>,
) {
  publishGamePatch(app.io, gameId, { map }, actorUserId, ctx);
}

async function publishActiveMapSwitchPatch(
  app: FastifyInstance,
  gameId: string,
  activeMapId: string | null,
  actorUserId?: string,
) {
  const listed = await listGameMaps(gameId);
  const active = activeMapId
    ? listed.maps.find((m) => m.id === activeMapId) ?? null
    : null;
  const patch: GamePatch = {
    settings: { activeMapId },
    ...(active ? { map: active } : {}),
  };
  publishGamePatch(app.io, gameId, patch, actorUserId);
}

async function publishMapDeletePatch(
  app: FastifyInstance,
  gameId: string,
  deletedMapId: string,
  activeMapId: string | null,
  actorUserId?: string,
) {
  const listed = await listGameMaps(gameId);
  const active = activeMapId
    ? listed.maps.find((m) => m.id === activeMapId) ?? null
    : null;
  const patch: GamePatch = {
    maps: { deletedIds: [deletedMapId] },
    settings: { activeMapId },
    ...(active ? { map: active } : {}),
  };
  publishGamePatch(app.io, gameId, patch, actorUserId);
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
      publishMapPatch(app, gameId, map, request.userId);
      return { map, patch: { map } };
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
      await publishActiveMapSwitchPatch(app, gameId, activeMapId, request.userId);
      const patch: GamePatch = { settings: { activeMapId } };
      const listed = await listGameMaps(gameId);
      const active = listed.maps.find((m) => m.id === activeMapId) ?? null;
      if (active) patch.map = active;
      return { activeMapId, patch };
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
        publishMapPatch(app, gameId, map, request.userId);
        return { map, patch: { map } };
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
      publishMapPatch(app, gameId, map, request.userId);
      return { map, patch: { map } };
    },
  );

  app.delete(
    '/games/:gameId/maps/:mapId',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, mapId } = request.params as { gameId: string; mapId: string };
      try {
        const { activeMapId } = await deleteGameMap(gameId, mapId);
        await publishMapDeletePatch(app, gameId, mapId, activeMapId, request.userId);
        const listed = await listGameMaps(gameId);
        const active = activeMapId
          ? listed.maps.find((m) => m.id === activeMapId) ?? null
          : null;
        const patch: GamePatch = {
          maps: { deletedIds: [mapId] },
          settings: { activeMapId },
          ...(active ? { map: active } : {}),
        };
        return { ok: true, activeMapId, patch };
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
      publishMapPatch(app, gameId, map, request.userId);
      return { map, patch: { map } };
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
      publishMapPatch(app, gameId, map, request.userId);
      return { map, patch: { map } };
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
      const map = await syncMapTokens(gameId, activeMapId);
      publishMapPatch(
        app,
        gameId,
        map,
        request.userId,
        publishContextFromRequest(request),
      );
      await recordAudit({
        gameId,
        actorUserId: request.userId,
        kind: AUDIT_KINDS.mapTokensReset,
        targetType: 'map',
        targetId: activeMapId,
        payload: { tokenCount: updated.length },
      });
      return { tokens: updated, map, patch: { map } };
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
      publishMapPatch(
        app,
        gameId,
        map,
        request.userId,
        publishContextFromRequest(request),
      );
      await recordAudit({
        gameId,
        actorUserId: request.userId,
        kind: AUDIT_KINDS.mapClear,
        targetType: 'map',
        targetId: activeMapId,
        payload: { clearImage: Boolean(body.clearImage) },
      });
      return { map, tokens: map.tokens, patch: { map } };
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
      await ensureCharacterMapToken(gameId, mapId, characterId);
      const map = await syncMapTokens(gameId, mapId);
      publishMapPatch(app, gameId, map, request.userId);
      return { map, patch: { map } };
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
      const patch: GamePatch = { tokens: { upserted: [updated] } };
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { token: updated, patch };
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

      const mapId = token.mapId;
      await deleteMapToken(tokenId, gameId);
      const map = await syncMapTokens(gameId, mapId);
      publishMapPatch(app, gameId, map, request.userId);
      return { ok: true, tokenId, map, patch: { map } };
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
      if (token) {
        publishGamePatch(app.io, movement.gameId, {
          tokens: { upserted: [token] },
        }, request.userId);
      }
      return { request: updatedReq, token };
    },
  );
}
