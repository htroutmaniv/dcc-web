import {
  defaultMonsterSheet,
  monsterGroupEntryId,
  monsterGroupLabel,
  parseMonsterSheet,
  rollDice,
  rollLootFromPool,
  rollMonsterInstanceStats,
  scaleMonsterStats,
  sortInitiativeEntries,
  spawnMonstersSchema,
  isMonsterEligibleForInitiative,
  MONSTER_IN_PLAY_KEY,
  resolveMonsterAfterHpChange,
  type GameInitiativeState,
  type GameMonsterInstance,
  type InitiativeEntry,
  type LootPoolEntry,
  type MonsterSheetData,
  type MonsterStatsJson,
} from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { secureRandomInt } from '../lib/rng.js';
import { prisma } from '../lib/prisma.js';
import { onMonsterDeleted } from './game-state.js';
import {
  loadGameWithSettings,
  loadInitiativeState,
  mutateInitiative,
  readGameSettings,
} from './game-settings-service.js';

type SpawnInput = z.infer<typeof spawnMonstersSchema>;

function rollInitiativeForMod(mod: number) {
  const notation = `1d20${mod >= 0 ? `+${mod}` : mod}`;
  const result = rollDice(notation, secureRandomInt);
  return {
    initiative: result.total,
    d20Roll: result.rolls[0] ?? 0,
    modifier: mod,
  };
}

function syncFlatFromSheet(
  sheet: MonsterSheetData,
  fallback: { ac: number; attackBonus: number; damage: string },
) {
  const primary = sheet.attacks[0];
  return {
    attackBonus: primary?.attackBonus ?? fallback.attackBonus,
    damage: primary?.damage ?? fallback.damage,
    ac: fallback.ac,
  };
}

export function toMonsterInstance(
  row: {
    id: string;
    gameId: string;
    catalogId: string | null;
    name: string;
    scaleLevel: number;
    hitDice: string;
    ac: number;
    attackBonus: number;
    damage: string;
    initMod: number;
    speed: number;
    hpMax: number;
    hpCurrent: number;
    notes: string;
    sheet: unknown;
    stats: unknown;
    combat: unknown;
    sortOrder: number;
  },
  items?: { id: string; category: string; name: string; quantity: number; notes: string; properties: unknown }[],
): GameMonsterInstance {
  const sheet = parseMonsterSheet(row.sheet);
  return {
    id: row.id,
    gameId: row.gameId,
    catalogId: row.catalogId,
    name: row.name,
    scaleLevel: row.scaleLevel,
    hitDice: row.hitDice,
    ac: row.ac,
    attackBonus: row.attackBonus,
    damage: row.damage,
    initMod: row.initMod,
    speed: row.speed,
    hpMax: row.hpMax,
    hpCurrent: row.hpCurrent,
    notes: row.notes,
    sortOrder: row.sortOrder,
    sheet,
    stats: (row.stats ?? {}) as GameMonsterInstance['stats'],
    combat: (row.combat ?? {}) as GameMonsterInstance['combat'],
    items: items?.map((i) => ({
      id: i.id,
      category: i.category,
      name: i.name,
      quantity: i.quantity,
      notes: i.notes,
      properties: (i.properties ?? {}) as Record<string, unknown>,
    })),
  };
}

async function rollLootItems(lootPoolId: string | null | undefined) {
  if (!lootPoolId) return [];
  const pool = await prisma.lootPool.findUnique({ where: { id: lootPoolId } });
  if (!pool) return [];
  const entries = pool.entries as unknown as LootPoolEntry[];
  return rollLootFromPool(entries, (max) => {
    const hi = Number(max);
    if (!Number.isFinite(hi) || hi < 1) return 1;
    return secureRandomInt(1, hi);
  });
}

export async function listGameMonsters(gameId: string): Promise<GameMonsterInstance[]> {
  const rows = await prisma.gameMonster.findMany({
    where: { gameId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((r) => toMonsterInstance(r, r.items));
}

export async function getGameMonster(
  gameId: string,
  monsterId: string,
): Promise<GameMonsterInstance> {
  const row = await prisma.gameMonster.findFirstOrThrow({
    where: { id: monsterId, gameId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  return toMonsterInstance(row, row.items);
}

export async function spawnGameMonsters(
  gameId: string,
  input: SpawnInput,
): Promise<{ monsters: GameMonsterInstance[]; initiative: GameInitiativeState | null }> {
  const count = input.count;
  const scaleLevel = input.scaleLevel;

  let baseName: string;
  let scaled: ReturnType<typeof scaleMonsterStats>;
  let catalogId: string | null = null;
  let templateSheet = defaultMonsterSheet();
  let lootPoolId: string | null = null;
  let hpAvg: number | null = null;

  if (input.catalogId) {
    const catalog = await prisma.monsterCatalog.findUniqueOrThrow({
      where: { id: input.catalogId },
    });
    catalogId = catalog.id;
    baseName = catalog.name;
    lootPoolId = catalog.lootPoolId;
    hpAvg = catalog.hpAvg;
    templateSheet = parseMonsterSheet(catalog.sheet);
    if (templateSheet.attacks.length === 0) {
      templateSheet = defaultMonsterSheet({
        name: 'Melee',
        attackBonus: catalog.attackBonus,
        damage: catalog.damage,
      });
    }
    scaled = scaleMonsterStats(
      {
        hitDice: catalog.hitDice,
        ac: catalog.ac,
        attackBonus: catalog.attackBonus,
        damage: catalog.damage,
        initMod: catalog.initMod,
        speed: catalog.speed,
        hpAvg: catalog.hpAvg,
      },
      catalog.baseLevel,
      scaleLevel,
    );
  } else if (input.custom) {
    baseName = input.custom.name;
    scaled = {
      hitDice: input.custom.hitDice,
      ac: input.custom.ac,
      attackBonus: input.custom.attackBonus,
      damage: input.custom.damage,
      initMod: input.custom.initMod,
      speed: input.custom.speed,
      hpMax: input.custom.hpMax,
    };
    templateSheet = defaultMonsterSheet({
      name: 'Melee',
      attackBonus: input.custom.attackBonus,
      damage: input.custom.damage,
    });
  } else {
    throw new Error('catalogId or custom required');
  }

  const existingCount = await prisma.gameMonster.count({ where: { gameId } });
  const created: GameMonsterInstance[] = [];

  for (let i = 0; i < count; i++) {
    const rolled = rollMonsterInstanceStats(
      { ...scaled, hpAvg, hitDice: scaled.hitDice },
      secureRandomInt,
    );
    const sheet: MonsterSheetData = {
      attacks: templateSheet.attacks.map((a, idx) => ({
        ...a,
        id: a.id || `atk-${idx}`,
        attackBonus: idx === 0 ? rolled.attackBonus : a.attackBonus,
        damage: idx === 0 ? rolled.damage : a.damage,
      })),
      specialAbilities: [...templateSheet.specialAbilities],
    };
    const suffix = count > 1 ? ` ${i + 1}` : '';
    const loot = await rollLootItems(lootPoolId);

    const row = await prisma.gameMonster.create({
      data: {
        gameId,
        catalogId,
        name: `${baseName}${suffix}`,
        scaleLevel,
        hitDice: rolled.hitDice,
        ac: rolled.ac,
        attackBonus: rolled.attackBonus,
        damage: rolled.damage,
        initMod: rolled.initMod,
        speed: rolled.speed,
        hpMax: rolled.hpMax,
        hpCurrent: rolled.hpMax,
        sheet: sheet as object,
        stats: {
          speed: rolled.speed,
          initiative: rolled.initMod,
          custom: { [MONSTER_IN_PLAY_KEY]: false },
        } as Prisma.InputJsonValue,
        combat: { ac: rolled.ac, hpMax: rolled.hpMax, hpCurrent: rolled.hpMax } as Prisma.InputJsonValue,
        sortOrder: existingCount + i,
        items: {
          create: loot
            .filter((e) => e.name.toLowerCase() !== 'nothing')
            .map((e, sortOrder) => ({
              category: e.category,
              name: e.name,
              quantity: e.quantity ?? 1,
              notes: e.notes ?? '',
              properties: (e.properties ?? {}) as Prisma.InputJsonValue,
              sortOrder,
            })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    created.push(toMonsterInstance(row, row.items));
  }

  let initiative: GameInitiativeState | null = null;
  const active = await loadInitiativeState(gameId);
  if (active?.active) {
    initiative = await syncMonsterGroupInitiative(gameId);
  }

  return { monsters: created, initiative };
}

export async function patchGameMonster(
  gameId: string,
  monsterId: string,
  patch: {
    name?: string;
    hpCurrent?: number;
    hpMax?: number;
    notes?: string;
    ac?: number;
    attackBonus?: number;
    damage?: string;
    initMod?: number;
    speed?: number;
    sheet?: MonsterSheetData;
    stats?: Record<string, unknown>;
    combat?: Record<string, unknown>;
  },
): Promise<{ monster: GameMonsterInstance; initiative: GameInitiativeState | null }> {
  const existing = await prisma.gameMonster.findFirstOrThrow({
    where: { id: monsterId, gameId },
  });
  const hpMax = patch.hpMax ?? existing.hpMax;
  let hpCurrent = patch.hpCurrent ?? existing.hpCurrent;
  if (hpCurrent > hpMax) hpCurrent = hpMax;

  const statsBefore = existing.stats as MonsterStatsJson | undefined;
  let statsAfter = (
    patch.stats !== undefined ? patch.stats : existing.stats
  ) as MonsterStatsJson | undefined;

  if (patch.hpCurrent !== undefined) {
    const resolved = resolveMonsterAfterHpChange(hpCurrent, statsAfter);
    hpCurrent = resolved.hpCurrent;
    statsAfter = resolved.stats;
  }

  const inInitiativeBefore = isMonsterEligibleForInitiative({
    hpCurrent: existing.hpCurrent,
    stats: statsBefore,
  });

  let sheet = parseMonsterSheet(existing.sheet);
  if (patch.sheet) sheet = patch.sheet;

  const ac = patch.ac ?? existing.ac;
  const flat = syncFlatFromSheet(sheet, {
    ac,
    attackBonus: patch.attackBonus ?? existing.attackBonus,
    damage: patch.damage ?? existing.damage,
  });

  const row = await prisma.gameMonster.update({
    where: { id: monsterId },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.initMod !== undefined && { initMod: patch.initMod }),
      ...(patch.speed !== undefined && { speed: patch.speed }),
      ac: flat.ac,
      attackBonus: flat.attackBonus,
      damage: flat.damage,
      hpMax,
      hpCurrent,
      sheet: sheet as object,
      stats: statsAfter as Prisma.InputJsonValue,
      combat: {
        ac: flat.ac,
        hpMax,
        hpCurrent,
        ...(patch.combat ?? {}),
      } as Prisma.InputJsonValue,
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  const inInitiativeAfter = isMonsterEligibleForInitiative({
    hpCurrent: row.hpCurrent,
    stats: row.stats as MonsterStatsJson | undefined,
  });
  let initiative: GameInitiativeState | null = null;
  if (inInitiativeBefore !== inInitiativeAfter) {
    initiative = await syncMonsterGroupInitiative(gameId);
  }

  return { monster: toMonsterInstance(row, row.items), initiative };
}

function filterInitiativeMonsters<T extends { hpCurrent: number; stats: unknown }>(
  rows: T[],
): T[] {
  return rows.filter((m) =>
    isMonsterEligibleForInitiative({
      hpCurrent: m.hpCurrent,
      stats: m.stats as MonsterStatsJson | undefined,
    }),
  );
}

export async function replaceMonsterItems(
  gameId: string,
  monsterId: string,
  items: { category: string; name: string; quantity?: number; notes?: string; properties?: Record<string, unknown> }[],
): Promise<GameMonsterInstance> {
  await prisma.gameMonster.findFirstOrThrow({ where: { id: monsterId, gameId } });
  await prisma.$transaction(async (tx) => {
    await tx.monsterItem.deleteMany({ where: { monsterId } });
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      await tx.monsterItem.create({
        data: {
          monsterId,
          category: item.category as 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable',
          name: item.name,
          quantity: item.quantity ?? 1,
          notes: item.notes ?? '',
          properties: (item.properties ?? {}) as Prisma.InputJsonValue,
          sortOrder: i,
        },
      });
    }
  });
  return getGameMonster(gameId, monsterId);
}

export async function deleteGameMonster(
  gameId: string,
  monsterId: string,
): Promise<{ initiative: GameInitiativeState | null }> {
  return onMonsterDeleted(gameId, monsterId);
}

/** Ensure monster initiative entries match current game settings and in-play monsters. */
export async function syncMonsterGroupInitiative(
  gameId: string,
): Promise<GameInitiativeState | null> {
  const game = await loadGameWithSettings(gameId);
  const gameSettings = readGameSettings(game);

  const { initiative } = await mutateInitiative(gameId, async (state) => {
    if (gameSettings.sharedMonsterInitiative) {
      return computeSharedMonsterGroupInitiative(gameId, state);
    }
    return computeIndividualMonsterInitiative(gameId, state);
  });
  return initiative;
}

async function computeSharedMonsterGroupInitiative(
  gameId: string,
  state: GameInitiativeState | null,
): Promise<GameInitiativeState | null> {
  const livingRows = await prisma.gameMonster.findMany({
    where: { gameId, hpCurrent: { gt: 0 } },
    select: { initMod: true, stats: true, hpCurrent: true },
  });
  const livingMonsters = filterInitiativeMonsters(livingRows);
  const living = livingMonsters.length;

  if (living === 0) {
    if (!state?.active) return null;
    const order = state.order.filter(
      (e) =>
        e.entryId !== monsterGroupEntryId(gameId) &&
        e.kind !== 'monster' &&
        e.kind !== 'monster_group',
    );
    const next: GameInitiativeState = {
      ...state,
      order,
      active: order.length > 0,
      turnIndex: Math.min(state.turnIndex, Math.max(0, order.length - 1)),
    };
    return next.active ? next : null;
  }

  const bestMod = Math.max(...livingMonsters.map((m) => m.initMod), 0);
  const entryId = monsterGroupEntryId(gameId);
  const label = monsterGroupLabel(living);

  let order = (state?.order ?? []).filter(
    (e) => e.kind !== 'monster' && e.kind !== 'monster_group',
  );
  const existingIdx = order.findIndex((e) => e.entryId === entryId);

  if (existingIdx >= 0) {
    order = order.map((e, i) =>
      i === existingIdx ? { ...e, name: label, modifier: bestMod } : e,
    );
  } else if (state?.active) {
    const rolled = rollInitiativeForMod(bestMod);
    const entry: InitiativeEntry = {
      entryId,
      kind: 'monster_group',
      name: label,
      initiative: rolled.initiative,
      d20Roll: rolled.d20Roll,
      modifier: rolled.modifier,
    };
    order = sortInitiativeEntries([...order, entry]);
  } else {
    return null;
  }

  const next: GameInitiativeState = {
    active: true,
    round: state?.round ?? 1,
    turnIndex: state?.turnIndex ?? 0,
    order,
  };
  return next;
}

async function computeIndividualMonsterInitiative(
  gameId: string,
  state: GameInitiativeState | null,
): Promise<GameInitiativeState | null> {
  if (!state?.active) return null;

  const livingRows = await prisma.gameMonster.findMany({
    where: { gameId, hpCurrent: { gt: 0 } },
    select: { id: true, name: true, initMod: true, stats: true, hpCurrent: true },
  });
  const eligible = filterInitiativeMonsters(livingRows);
  const eligibleIds = new Set(eligible.map((m) => m.id));

  let order = state.order.filter((e) => {
    if (e.entryId === monsterGroupEntryId(gameId) || e.kind === 'monster_group') {
      return false;
    }
    if (e.kind === 'monster' && e.monsterId) {
      return eligibleIds.has(e.monsterId);
    }
    return true;
  });

  const existingMonsterIds = new Set(
    order
      .filter((e) => e.kind === 'monster' && e.monsterId)
      .map((e) => e.monsterId!),
  );

  const newEntries: InitiativeEntry[] = [];
  for (const m of eligible) {
    if (existingMonsterIds.has(m.id)) continue;
    const rolled = rollInitiativeForMod(m.initMod);
    newEntries.push({
      entryId: m.id,
      kind: 'monster',
      monsterId: m.id,
      name: m.name,
      initiative: rolled.initiative,
      d20Roll: rolled.d20Roll,
      modifier: rolled.modifier,
    });
  }

  if (newEntries.length > 0) {
    order = sortInitiativeEntries([...order, ...newEntries]);
  }

  order = order.map((e) => {
    if (e.kind === 'monster' && e.monsterId) {
      const m = eligible.find((row) => row.id === e.monsterId);
      if (m) return { ...e, name: m.name, modifier: m.initMod };
    }
    return e;
  });

  const next: GameInitiativeState = {
    ...state,
    order,
    active: order.length > 0,
    turnIndex: Math.min(state.turnIndex, Math.max(0, order.length - 1)),
  };
  return next.active ? next : null;
}

async function buildIndividualMonsterInitiativeEntries(
  gameId: string,
): Promise<InitiativeEntry[]> {
  const rows = await prisma.gameMonster.findMany({
    where: { gameId, hpCurrent: { gt: 0 } },
    select: { id: true, name: true, initMod: true, stats: true, hpCurrent: true },
  });
  const eligible = filterInitiativeMonsters(rows);
  return eligible.map((m) => {
    const rolled = rollInitiativeForMod(m.initMod);
    return {
      entryId: m.id,
      kind: 'monster' as const,
      monsterId: m.id,
      name: m.name,
      initiative: rolled.initiative,
      d20Roll: rolled.d20Roll,
      modifier: rolled.modifier,
    };
  });
}

export async function buildMonsterGroupInitiativeEntry(
  gameId: string,
): Promise<InitiativeEntry | null> {
  const game = await loadGameWithSettings(gameId);
  if (!readGameSettings(game).sharedMonsterInitiative) return null;

  const livingRows = await prisma.gameMonster.findMany({
    where: { gameId, hpCurrent: { gt: 0 } },
    select: { initMod: true, stats: true, hpCurrent: true },
  });
  const livingMonsters = filterInitiativeMonsters(livingRows);
  const living = livingMonsters.length;
  if (living === 0) return null;

  const bestMod = Math.max(...livingMonsters.map((m) => m.initMod), 0);
  const rolled = rollInitiativeForMod(bestMod);
  return {
    entryId: monsterGroupEntryId(gameId),
    kind: 'monster_group',
    name: monsterGroupLabel(living),
    initiative: rolled.initiative,
    d20Roll: rolled.d20Roll,
    modifier: rolled.modifier,
  };
}

export async function buildMonsterInitiativeEntriesForStart(
  gameId: string,
): Promise<InitiativeEntry[]> {
  const game = await loadGameWithSettings(gameId);
  if (readGameSettings(game).sharedMonsterInitiative) {
    const entry = await buildMonsterGroupInitiativeEntry(gameId);
    return entry ? [entry] : [];
  }
  return buildIndividualMonsterInitiativeEntries(gameId);
}

/** @deprecated Use syncMonsterGroupInitiative */
export async function addMonstersToInitiative(
  gameId: string,
  _monsterIds?: string[],
): Promise<GameInitiativeState | null> {
  return syncMonsterGroupInitiative(gameId);
}

/** @deprecated Use buildMonsterInitiativeEntriesForStart */
export async function buildMonsterInitiativeEntries(
  gameId: string,
): Promise<InitiativeEntry[]> {
  return buildMonsterInitiativeEntriesForStart(gameId);
}
