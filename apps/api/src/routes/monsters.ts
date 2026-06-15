import {
  monsterCatalogQuerySchema,
  patchGameMonsterSchema,
  replaceMonsterItemsSchema,
  spawnMonstersSchema,
  transferInventoryItemSchema,
  upsertLootPoolSchema,
  upsertMonsterCatalogSchema,
  isMonsterInPlay,
  isMonsterKilled,
  type GamePatch,
  type MonsterStatsJson,
} from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { publishContextFromRequest } from '../lib/game-events.js';
import { publishGamePatch } from '../lib/game-patch-publish.js';
import { AUDIT_KINDS, recordAudit } from '../services/audit-service.js';
import { buildMonsterDeletedPatch, buildMonsterUpsertPatch } from '../services/game-state.js';
import { syncActiveMapTokens } from '../services/map-service.js';
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
import { loadGameSettings } from '../services/game-settings-service.js';
import { transferInventoryItem, assertTransferInventoryAllowed } from '../services/inventory-transfer-service.js';

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
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const monsters = await listGameMonsters(gameId);
      return { monsters };
    },
  );

  app.get(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId, monsterId } = request.params as { gameId: string; monsterId: string };
      const monster = await getGameMonster(gameId, monsterId);
      return { monster };
    },
  );

  app.post(
    '/games/:gameId/monsters/spawn',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const parsed = spawnMonstersSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const { monsters, initiative } = await spawnGameMonsters(gameId, parsed.data);
      const map = await syncActiveMapTokens(gameId);
      const patch: GamePatch = {
        monsters: { upserted: monsters },
        ...(map ? { map } : {}),
        ...(initiative ? { initiative } : {}),
      };
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { monsters, initiative, patch };
    },
  );

  app.post(
    '/games/:gameId/monsters/add-to-initiative',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const initiative = await syncMonsterGroupInitiative(gameId);
      publishGamePatch(app.io, gameId, { initiative }, request.userId);
      return { initiative, patch: { initiative } };
    },
  );

  app.patch(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const parsed = patchGameMonsterSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const existing = await prisma.gameMonster.findFirstOrThrow({
        where: { id: monsterId, gameId },
      });
      const wasKilled = isMonsterKilled({
        stats: existing.stats as MonsterStatsJson | undefined,
      });
      const wasInPlay = isMonsterInPlay({
        stats: existing.stats as MonsterStatsJson | undefined,
      });

      const { monster, initiative } = await patchGameMonster(gameId, monsterId, parsed.data);
      const map = await syncActiveMapTokens(gameId);
      const eventCtx = publishContextFromRequest(request);
      const patch = buildMonsterUpsertPatch(monster, {
        map,
        ...(initiative !== null ? { initiative } : {}),
      });
      publishGamePatch(app.io, gameId, patch, request.userId, eventCtx);

      const nowKilled = isMonsterKilled({
        stats: monster.stats as MonsterStatsJson | undefined,
      });
      if (!wasKilled && nowKilled) {
        await recordAudit({
          gameId,
          actorUserId: request.userId,
          kind: AUDIT_KINDS.monsterKilled,
          targetType: 'monster',
          targetId: monsterId,
          payload: { name: monster.name },
        });
      }
      const nowInPlay = isMonsterInPlay({
        stats: monster.stats as MonsterStatsJson | undefined,
      });
      if (wasInPlay !== nowInPlay) {
        await recordAudit({
          gameId,
          actorUserId: request.userId,
          kind: AUDIT_KINDS.monsterInPlay,
          targetType: 'monster',
          targetId: monsterId,
          payload: { name: monster.name, from: wasInPlay, to: nowInPlay },
        });
      }

      return { monster, initiative, patch, ...(map ? { map } : {}) };
    },
  );

  app.put(
    '/games/:gameId/monsters/:monsterId/items',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const parsed = replaceMonsterItemsSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const monster = await replaceMonsterItems(gameId, monsterId, parsed.data.items);
      const patch = buildMonsterUpsertPatch(monster);
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { monster, patch };
    },
  );

  app.post(
    '/games/:gameId/transfer-item',
    { onRequest: [app.authenticate], preHandler: [app.requireMember] },
    async (request) => {
      const { gameId } = request.params as { gameId: string };
      const access = request.gameAccess!;
      const parsed = transferInventoryItemSchema.safeParse(request.body);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      try {
        await assertTransferInventoryAllowed({
          gameId,
          userId: access.userId,
          isDm: access.isDm,
          gameSettings: await loadGameSettings(gameId),
          input: parsed.data,
        });
        const result = await transferInventoryItem(gameId, parsed.data);
        const patch: GamePatch = {};
        const upsertedCharacters = [result.sourceCharacter, result.targetCharacter].filter(
          (row): row is NonNullable<typeof result.sourceCharacter> => row != null,
        );
        if (upsertedCharacters.length > 0) {
          patch.characters = { upserted: upsertedCharacters };
        }
        const upsertedMonsters = [result.sourceMonster, result.targetMonster].filter(
          (row): row is NonNullable<typeof result.sourceMonster> => row != null,
        );
        if (upsertedMonsters.length > 0) {
          patch.monsters = { upserted: upsertedMonsters };
        }
        publishGamePatch(app.io, gameId, patch, request.userId, publishContextFromRequest(request));
        await recordAudit({
          gameId,
          actorUserId: request.userId,
          kind: AUDIT_KINDS.inventoryTransfer,
          targetType: 'inventory',
          targetId: parsed.data.sourceItemId,
          payload: {
            sourceType: parsed.data.sourceType,
            sourceId: parsed.data.sourceId,
            targetType: parsed.data.targetType,
            targetId: parsed.data.targetId,
            quantity: parsed.data.quantity ?? 1,
          },
        });
        return { ...result, patch };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Transfer failed';
        return app.httpErrors.badRequest(msg);
      }
    },
  );

  app.delete(
    '/games/:gameId/monsters/:monsterId',
    { onRequest: [app.authenticate], preHandler: [app.requireDm] },
    async (request) => {
      const { gameId, monsterId } = request.params as {
        gameId: string;
        monsterId: string;
      };
      const { initiative } = await deleteGameMonster(gameId, monsterId);
      const map = await syncActiveMapTokens(gameId);
      const patch = buildMonsterDeletedPatch(monsterId, {
        map,
        ...(initiative !== null ? { initiative } : {}),
      });
      publishGamePatch(app.io, gameId, patch, request.userId);
      return { ok: true, initiative, patch, ...(map ? { map } : {}) };
    },
  );
}
