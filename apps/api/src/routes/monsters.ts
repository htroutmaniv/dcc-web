import {
  addMonstersToInitiativeSchema,
  monsterCatalogQuerySchema,
  patchGameMonsterSchema,
  replaceMonsterItemsSchema,
  spawnMonstersSchema,
  upsertLootPoolSchema,
  upsertMonsterCatalogSchema,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameDm } from '../lib/assert-game-dm.js';
import { assertGameMember } from '../lib/game-access.js';
import { emitToGame } from '../lib/game-socket.js';
import { prisma } from '../lib/prisma.js';
import {
  deleteGameMonster,
  getGameMonster,
  listGameMonsters,
  patchGameMonster,
  replaceMonsterItems,
  spawnGameMonsters,
  syncMonsterGroupInitiative,
} from '../services/monster-service.js';
import { getInitiativeFromGame } from '../services/initiative-service.js';

function emitMonstersChanged(
  app: FastifyInstance,
  gameId: string,
  actorUserId?: string,
) {
  emitToGame(app.io, gameId, 'monsters:changed', { actorUserId });
}

function emitInitiativeUpdate(
  app: FastifyInstance,
  gameId: string,
  initiative: ReturnType<typeof getInitiativeFromGame>,
  actorUserId?: string,
) {
  emitToGame(app.io, gameId, 'initiative:updated', { initiative, actorUserId });
}

async function assertCatalogEditor(userId: string, app: FastifyInstance) {
  const dmGame = await prisma.game.findFirst({
    where: { dmUserId: userId },
    select: { id: true },
  });
  if (!dmGame) {
    throw app.httpErrors.forbidden('Only dungeon masters can edit the bestiary');
  }
}

export async function monsterRoutes(app: FastifyInstance) {
  app.get(
    '/monsters/catalog',
    { onRequest: [app.authenticate] },
    async (request) => {
      const parsed = monsterCatalogQuerySchema.safeParse(request.query);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const { q, limit } = parsed.data;
      const rows = await prisma.monsterCatalog.findMany({
        where: q?.trim()
          ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
          : {},
        orderBy: { name: 'asc' },
        take: limit,
        include: { lootPool: { select: { id: true, name: true } } },
      });
      return {
        monsters: rows.map((r) => ({
          ...r,
          lootPoolId: r.lootPoolId,
          lootPoolName: r.lootPool?.name ?? null,
        })),
      };
    },
  );

  app.get(
    '/monsters/catalog/:catalogId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { catalogId } = request.params as { catalogId: string };
      const row = await prisma.monsterCatalog.findUniqueOrThrow({
        where: { id: catalogId },
        include: { lootPool: true },
      });
      return { monster: row };
    },
  );

  app.post(
    '/monsters/catalog',
    { onRequest: [app.authenticate] },
    async (request) => {
      await assertCatalogEditor(request.userId!, app);
      const parsed = upsertMonsterCatalogSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const d = parsed.data;
      const row = await prisma.monsterCatalog.create({
        data: {
          name: d.name,
          description: d.description ?? '',
          baseLevel: d.baseLevel,
          hitDice: d.hitDice,
          ac: d.ac,
          attackBonus: d.attackBonus,
          damage: d.damage,
          initMod: d.initMod,
          speed: d.speed,
          hpAvg: d.hpAvg ?? null,
          tags: d.tags ?? [],
          sheet: (d.sheet ?? {}) as object,
          stats: (d.stats ?? {}) as object,
          combat: (d.combat ?? {}) as object,
          lootPoolId: d.lootPoolId ?? null,
        },
      });
      return { monster: row };
    },
  );

  app.put(
    '/monsters/catalog/:catalogId',
    { onRequest: [app.authenticate] },
    async (request) => {
      await assertCatalogEditor(request.userId!, app);
      const { catalogId } = request.params as { catalogId: string };
      const parsed = upsertMonsterCatalogSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
      const d = parsed.data;
      const row = await prisma.monsterCatalog.update({
        where: { id: catalogId },
        data: {
          name: d.name,
          description: d.description ?? '',
          baseLevel: d.baseLevel,
          hitDice: d.hitDice,
          ac: d.ac,
          attackBonus: d.attackBonus,
          damage: d.damage,
          initMod: d.initMod,
          speed: d.speed,
          hpAvg: d.hpAvg ?? null,
          tags: d.tags ?? [],
          sheet: (d.sheet ?? {}) as object,
          stats: (d.stats ?? {}) as object,
          combat: (d.combat ?? {}) as object,
          lootPoolId: d.lootPoolId ?? null,
        },
      });
      return { monster: row };
    },
  );

  app.delete(
    '/monsters/catalog/:catalogId',
    { onRequest: [app.authenticate] },
    async (request) => {
      await assertCatalogEditor(request.userId!, app);
      const { catalogId } = request.params as { catalogId: string };
      await prisma.monsterCatalog.delete({ where: { id: catalogId } });
      return { ok: true };
    },
  );

  app.get('/loot-pools', { onRequest: [app.authenticate] }, async () => {
    const pools = await prisma.lootPool.findMany({ orderBy: { name: 'asc' } });
    return { pools };
  });

  app.post('/loot-pools', { onRequest: [app.authenticate] }, async (request) => {
    await assertCatalogEditor(request.userId!, app);
    const parsed = upsertLootPoolSchema.safeParse(request.body);
    if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
    const d = parsed.data;
    const pool = await prisma.lootPool.create({
      data: {
        name: d.name,
        description: d.description ?? '',
        entries: d.entries as object,
      },
    });
    return { pool };
  });

  app.put('/loot-pools/:poolId', { onRequest: [app.authenticate] }, async (request) => {
    await assertCatalogEditor(request.userId!, app);
    const { poolId } = request.params as { poolId: string };
    const parsed = upsertLootPoolSchema.safeParse(request.body);
    if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);
    const d = parsed.data;
    const pool = await prisma.lootPool.update({
      where: { id: poolId },
      data: {
        name: d.name,
        description: d.description ?? '',
        entries: d.entries as object,
      },
    });
    return { pool };
  });

  app.get(
    '/games/:gameId/monsters',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const monsters = await listGameMonsters(gameId);
      return { monsters };
    },
  );

  app.get(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, monsterId } = request.params as { gameId: string; monsterId: string };
      const access = await assertGameMember(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const monster = await getGameMonster(gameId, monsterId);
      return { monster };
    },
  );

  app.post(
    '/games/:gameId/monsters/spawn',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const parsed = spawnMonstersSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const { monsters, initiative } = await spawnGameMonsters(gameId, parsed.data);
      emitMonstersChanged(app, gameId, request.userId);
      if (initiative) {
        emitInitiativeUpdate(app, gameId, initiative, request.userId);
      }
      return { monsters, initiative };
    },
  );

  app.post(
    '/games/:gameId/monsters/add-to-initiative',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const parsed = addMonstersToInitiativeSchema.safeParse(request.body ?? {});
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const initiative = await syncMonsterGroupInitiative(gameId);
      emitInitiativeUpdate(app, gameId, initiative, request.userId);
      return { initiative };
    },
  );

  app.patch(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const parsed = patchGameMonsterSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const monster = await patchGameMonster(gameId, monsterId, parsed.data);
      emitMonstersChanged(app, gameId, request.userId);
      return { monster };
    },
  );

  app.put(
    '/games/:gameId/monsters/:monsterId/items',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const parsed = replaceMonsterItemsSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const monster = await replaceMonsterItems(gameId, monsterId, parsed.data.items);
      emitMonstersChanged(app, gameId, request.userId);
      return { monster };
    },
  );

  app.delete(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const access = await assertGameDm(request.userId!, gameId);
      if (!access.ok) {
        throw app.httpErrors.createError(access.status, access.message);
      }
      const { initiative } = await deleteGameMonster(gameId, monsterId);
      emitMonstersChanged(app, gameId, request.userId);
      emitInitiativeUpdate(app, gameId, initiative, request.userId);
      return { ok: true, initiative };
    },
  );
}
