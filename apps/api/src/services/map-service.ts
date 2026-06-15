import {
  computeUpperLeftTokenGrid,
  computeUpperRightTokenGrid,
  isCharacterMapTokenVisible,
  isMonsterInPlay,
  isMonsterKilled,
  parseMapDrawings,
  resolveMapGridPreset,
  type MapDrawing,
  type MapGridPreset,
  type MonsterStatsJson,
} from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { saveMapImageBuffer } from '../lib/map-image-upload.js';
import { mapUploadPathFromUrl } from '../lib/storage-paths.js';
import {
  loadGameWithSettings,
  readGameSettings,
  setGameActiveMapId,
} from './game-settings-service.js';

export type MapTokenDto = {
  id: string;
  mapId: string;
  kind: string;
  label: string;
  characterId: string | null;
  monsterId: string | null;
  x: number;
  y: number;
  zone: string;
  color: string;
  hpMax: number | null;
  hpCurrent: number | null;
  isDead: boolean;
};

export type GameMapDto = {
  id: string;
  gameId: string;
  name: string;
  sortOrder: number;
  visible: boolean;
  gridPreset: string;
  imageUrl: string | null;
  widthPx: number;
  heightPx: number;
  imageScale: number;
  gridCellPx: number;
  gridFtPerCell: number;
  dmDrawings: MapDrawing[];
  tokens: MapTokenDto[];
};

type MapTokenRow = {
  id: string;
  mapId: string;
  kind: string;
  label: string;
  characterId: string | null;
  monsterId: string | null;
  x: number;
  y: number;
  zone: string;
  color: string;
  hpMax: number | null;
  hpCurrent: number | null;
  character?: { status: string } | null;
  monster?: { hpCurrent: number; stats: unknown } | null;
};

function isMapTokenDead(row: MapTokenRow): boolean {
  if (row.kind === 'pc' && row.character) {
    return row.character.status === 'dead';
  }
  if (row.kind === 'monster' && row.monster) {
    return (
      isMonsterKilled({ stats: row.monster.stats as MonsterStatsJson | undefined }) ||
      row.monster.hpCurrent <= 0
    );
  }
  return false;
}

function toTokenDto(row: MapTokenRow): MapTokenDto {
  return {
    id: row.id,
    mapId: row.mapId,
    kind: row.kind,
    label: row.label,
    characterId: row.characterId,
    monsterId: row.monsterId,
    x: row.x,
    y: row.y,
    zone: row.zone,
    color: row.color,
    hpMax: row.hpMax,
    hpCurrent: row.hpCurrent,
    isDead: isMapTokenDead(row),
  };
}

const mapTokenInclude = {
  character: { select: { status: true } },
  monster: { select: { hpCurrent: true, stats: true } },
} as const;

export async function deleteTokensForCharacter(characterId: string): Promise<void> {
  await prisma.mapToken.deleteMany({ where: { characterId } });
}

export async function deleteTokensForMonster(monsterId: string): Promise<void> {
  await prisma.mapToken.deleteMany({ where: { monsterId } });
}

export async function deleteMapToken(tokenId: string, gameId: string): Promise<void> {
  const token = await prisma.mapToken.findFirstOrThrow({
    where: { id: tokenId, map: { gameId } },
  });
  await prisma.mapToken.delete({ where: { id: token.id } });
}

function toMapDto(
  row: {
    id: string;
    gameId: string;
    name: string;
    sortOrder: number;
    visible: boolean;
    gridPreset: string;
    imageUrl: string | null;
    widthPx: number;
    heightPx: number;
    imageScale?: number;
    gridCellPx: number;
    gridFtPerCell: Prisma.Decimal;
    dmDrawings: unknown;
  },
  tokens: MapTokenDto[],
): GameMapDto {
  const preset = resolveMapGridPreset(row.gridPreset);
  return {
    id: row.id,
    gameId: row.gameId,
    name: row.name,
    sortOrder: row.sortOrder,
    visible: row.visible,
    gridPreset: row.gridPreset,
    imageUrl: row.imageUrl,
    widthPx: row.widthPx,
    heightPx: row.heightPx,
    imageScale: (row as { imageScale?: number }).imageScale ?? 1,
    gridCellPx: row.gridCellPx || preset.gridCellPx,
    gridFtPerCell: Number(row.gridFtPerCell) || preset.gridFtPerCell,
    dmDrawings: parseMapDrawings(row.dmDrawings),
    tokens,
  };
}

async function loadMapTokens(mapId: string): Promise<MapTokenDto[]> {
  const tokens = await prisma.mapToken.findMany({
    where: { mapId },
    include: mapTokenInclude,
  });
  return tokens.map(toTokenDto);
}

async function loadMapDto(mapId: string): Promise<GameMapDto> {
  const row = await prisma.gameMap.findUniqueOrThrow({ where: { id: mapId } });
  return toMapDto(row, await loadMapTokens(mapId));
}

export async function listGameMaps(gameId: string): Promise<{
  maps: GameMapDto[];
  activeMapId: string | null;
}> {
  const game = await loadGameWithSettings(gameId);
  const settings = readGameSettings(game);
  const rows = await prisma.gameMap.findMany({
    where: { gameId },
    orderBy: { sortOrder: 'asc' },
  });
  const maps: GameMapDto[] = [];
  for (const row of rows) {
    maps.push(toMapDto(row, await loadMapTokens(row.id)));
  }
  const activeMapId =
    settings.activeMapId && maps.some((m) => m.id === settings.activeMapId)
      ? settings.activeMapId
      : maps.find((m) => m.visible)?.id ?? maps[0]?.id ?? null;
  return { maps, activeMapId };
}

export async function createGameMap(
  gameId: string,
  input?: { name?: string; gridPreset?: MapGridPreset },
): Promise<GameMapDto> {
  const count = await prisma.gameMap.count({ where: { gameId } });
  const preset = resolveMapGridPreset(input?.gridPreset);
  const row = await prisma.gameMap.create({
    data: {
      gameId,
      name: input?.name ?? `Map ${count + 1}`,
      sortOrder: count,
      gridPreset: preset.id,
      gridCellPx: preset.gridCellPx,
      gridFtPerCell: preset.gridFtPerCell,
    },
  });
  if (count === 0) {
    await setActiveMapId(gameId, row.id);
  }
  return loadMapDto(row.id);
}

export async function setActiveMapId(gameId: string, mapId: string): Promise<string | null> {
  return setGameActiveMapId(gameId, mapId);
}

export async function uploadGameMapImage(
  gameId: string,
  mapId: string,
  buffer: Buffer,
  dims: { widthPx?: number; heightPx?: number; imageScale?: number },
): Promise<GameMapDto> {
  const existing = await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  const saved = await saveMapImageBuffer(mapId, buffer, existing.imageUrl);
  await prisma.gameMap.update({
    where: { id: mapId },
    data: {
      imageUrl: saved.imageUrl,
      widthPx: dims.widthPx ?? 0,
      heightPx: dims.heightPx ?? 0,
      imageScale: dims.imageScale ?? 1,
    },
  });
  return loadMapDto(mapId);
}

export async function patchGameMap(
  gameId: string,
  mapId: string,
  patch: {
    name?: string;
    visible?: boolean;
    gridPreset?: MapGridPreset;
    dmDrawings?: MapDrawing[];
    clearImage?: boolean;
    widthPx?: number;
    heightPx?: number;
    imageScale?: number;
  },
): Promise<GameMapDto> {
  const existing = await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  const data: Prisma.GameMapUpdateInput = {};

  if (patch.name !== undefined) data.name = patch.name;
  if (patch.visible !== undefined) data.visible = patch.visible;
  if (patch.gridPreset !== undefined) {
    const preset = resolveMapGridPreset(patch.gridPreset);
    data.gridPreset = preset.id;
    data.gridCellPx = preset.gridCellPx;
    data.gridFtPerCell = preset.gridFtPerCell;
  }
  if (patch.dmDrawings !== undefined) {
    data.dmDrawings = patch.dmDrawings as unknown as Prisma.InputJsonValue;
  }
  if (patch.widthPx !== undefined) data.widthPx = patch.widthPx;
  if (patch.heightPx !== undefined) data.heightPx = patch.heightPx;
  if (patch.imageScale !== undefined) {
    (data as Prisma.GameMapUpdateInput & { imageScale?: number }).imageScale = patch.imageScale;
  }
  if (patch.clearImage) {
    const existingFile = mapUploadPathFromUrl(existing.imageUrl);
    if (existingFile) {
      await unlink(existingFile).catch(() => {});
    }
    data.imageUrl = null;
    data.widthPx = 0;
    data.heightPx = 0;
    (data as Prisma.GameMapUpdateInput & { imageScale?: number }).imageScale = 1;
  }

  await prisma.gameMap.update({ where: { id: mapId }, data });
  return loadMapDto(mapId);
}

export async function deleteGameMap(
  gameId: string,
  mapId: string,
): Promise<{ activeMapId: string | null }> {
  const count = await prisma.gameMap.count({ where: { gameId } });
  if (count <= 1) throw new Error('Cannot delete the only map');
  const existing = await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  const existingFile = mapUploadPathFromUrl(existing.imageUrl);
  if (existingFile) {
    await unlink(existingFile).catch(() => {});
  }
  await prisma.gameMap.delete({ where: { id: mapId } });
  const { maps, activeMapId } = await listGameMaps(gameId);
  const nextActive = activeMapId ?? maps[0]?.id ?? null;
  if (nextActive) await setActiveMapId(gameId, nextActive);
  return { activeMapId: nextActive };
}

const PC_COLORS = ['#4a90d9', '#50c878', '#e8a838', '#b57edc', '#e85d5d', '#5bc0be'];

type CharacterRow = {
  id: string;
  status: string;
  name: string;
  stats: unknown;
};

type MonsterRow = {
  id: string;
  name: string;
  stats: unknown;
};

type ExistingToken = {
  id: string;
  kind: string;
  characterId: string | null;
  monsterId: string | null;
  label: string;
  zone: string;
};

export type MapTokenSyncPlan = {
  toCreate: Prisma.MapTokenCreateManyInput[];
  toUpdate: { id: string; data: Prisma.MapTokenUpdateInput }[];
  toDeleteIds: string[];
};

/** Pure sync plan from loaded rows — used by syncMapTokens. */
export function planMapTokenSync(
  mapId: string,
  allCharacters: CharacterRow[],
  monsters: MonsterRow[],
  existing: ExistingToken[],
): MapTokenSyncPlan {
  const toCreate: Prisma.MapTokenCreateManyInput[] = [];
  const toUpdate: { id: string; data: Prisma.MapTokenUpdateInput }[] = [];
  const toDeleteIds = new Set<string>();

  const charById = new Map(allCharacters.map((c) => [c.id, c]));
  const monsterIds = new Set(monsters.map((m) => m.id));

  let pcIndex = 0;
  const alive = allCharacters.filter((c) => c.status === 'alive');
  for (const c of alive) {
    const token = existing.find((t) => t.characterId === c.id);
    const visible = isCharacterMapTokenVisible({
      stats: c.stats as { custom?: Record<string, unknown> },
    });
    if (!visible) {
      if (token) toDeleteIds.add(token.id);
      continue;
    }
    if (!token) {
      toCreate.push({
        mapId,
        kind: 'pc',
        characterId: c.id,
        label: c.name,
        x: 2 + pcIndex,
        y: 2,
        zone: 'map',
        color: PC_COLORS[pcIndex % PC_COLORS.length]!,
      });
    } else if (token.label !== c.name) {
      toUpdate.push({ id: token.id, data: { label: c.name } });
    }
    pcIndex += 1;
  }

  const dead = allCharacters.filter((c) => c.status === 'dead');
  for (const c of dead) {
    const token = existing.find((t) => t.characterId === c.id);
    const visible = isCharacterMapTokenVisible({
      stats: c.stats as { custom?: Record<string, unknown> },
    });
    if (!visible) {
      if (token) toDeleteIds.add(token.id);
      continue;
    }
    if (token) {
      if (token.label !== c.name) {
        toUpdate.push({ id: token.id, data: { label: c.name } });
      }
      continue;
    }
    toCreate.push({
      mapId,
      kind: 'pc',
      characterId: c.id,
      label: c.name,
      x: 2 + pcIndex,
      y: 2,
      zone: 'map',
      color: '#4a4a4a',
    });
    pcIndex += 1;
  }

  let monsterIndex = 0;
  for (const m of monsters) {
    const stats = m.stats as MonsterStatsJson | undefined;
    const killed = isMonsterKilled({ stats });
    const inPlay = isMonsterInPlay({ stats });
    const token = existing.find((t) => t.monsterId === m.id);

    if (!killed && !inPlay) {
      if (token) toDeleteIds.add(token.id);
      continue;
    }

    if (!token) {
      toCreate.push({
        mapId,
        kind: 'monster',
        monsterId: m.id,
        label: m.name,
        x: 8 + monsterIndex,
        y: 2,
        zone: 'map',
        color: killed ? '#4a4a4a' : '#8b2635',
      });
      monsterIndex += 1;
      continue;
    }

    const updates: Prisma.MapTokenUpdateInput = {};
    if (token.label !== m.name) updates.label = m.name;
    if (token.zone !== 'map') updates.zone = 'map';
    if (Object.keys(updates).length > 0) {
      toUpdate.push({ id: token.id, data: updates });
    }
    monsterIndex += 1;
  }

  for (const token of existing) {
    if (toDeleteIds.has(token.id)) continue;
    if (token.characterId) {
      const ch = charById.get(token.characterId);
      if (!ch || ch.status === 'archived') {
        toDeleteIds.add(token.id);
      }
      continue;
    }
    if (token.kind === 'monster' && (!token.monsterId || !monsterIds.has(token.monsterId))) {
      toDeleteIds.add(token.id);
    }
  }

  return { toCreate, toUpdate, toDeleteIds: [...toDeleteIds] };
}

async function applyMapTokenSyncPlan(plan: MapTokenSyncPlan): Promise<void> {
  const { toCreate, toUpdate, toDeleteIds } = plan;
  if (toDeleteIds.length === 0 && toCreate.length === 0 && toUpdate.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (toDeleteIds.length > 0) {
      await tx.mapToken.deleteMany({ where: { id: { in: toDeleteIds } } });
    }
    if (toCreate.length > 0) {
      await tx.mapToken.createMany({ data: toCreate });
    }
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((row) => tx.mapToken.update({ where: { id: row.id }, data: row.data })),
      );
    }
  });
}

export async function ensureCharacterMapToken(
  gameId: string,
  mapId: string,
  characterId: string,
): Promise<MapTokenDto> {
  await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  const character = await prisma.character.findFirstOrThrow({
    where: { id: characterId, gameId },
    select: { id: true, name: true, status: true },
  });
  if (character.status === 'archived') {
    throw new Error('Cannot place archived character on the map');
  }

  const existing = await prisma.mapToken.findFirst({
    where: { mapId, characterId },
    include: mapTokenInclude,
  });
  if (existing) return toTokenDto(existing);

  const pcCount = await prisma.mapToken.count({ where: { mapId, kind: 'pc' } });
  const row = await prisma.mapToken.create({
    data: {
      mapId,
      kind: 'pc',
      characterId: character.id,
      label: character.name,
      x: 2 + pcCount,
      y: 2,
      zone: 'map',
      color: PC_COLORS[pcCount % PC_COLORS.length]!,
    },
    include: mapTokenInclude,
  });
  return toTokenDto(row);
}

export async function syncMapTokens(gameId: string, mapId: string): Promise<GameMapDto> {
  await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });

  const [allCharacters, monsters, existing] = await Promise.all([
    prisma.character.findMany({
      where: { gameId },
      select: { id: true, status: true, name: true, stats: true },
      orderBy: { name: 'asc' },
    }),
    prisma.gameMonster.findMany({
      where: { gameId },
      select: { id: true, name: true, stats: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.mapToken.findMany({
      where: { mapId },
      select: {
        id: true,
        kind: true,
        characterId: true,
        monsterId: true,
        label: true,
        zone: true,
      },
    }),
  ]);

  const plan = planMapTokenSync(mapId, allCharacters, monsters, existing);
  await applyMapTokenSyncPlan(plan);
  return loadMapDto(mapId);
}

export async function syncActiveMapTokens(gameId: string): Promise<GameMapDto | null> {
  const { activeMapId } = await listGameMaps(gameId);
  if (!activeMapId) return null;
  return syncMapTokens(gameId, activeMapId);
}

export async function layoutMapTokens(
  gameId: string,
  mapId: string,
  options?: {
    kinds?: ('pc' | 'monster')[];
    anchorRightCol?: number;
    anchorLeftCol?: number;
    anchorTopRow?: number;
    visibleLeft?: number;
    visibleTop?: number;
    visibleRight?: number;
    visibleBottom?: number;
  },
): Promise<GameMapDto> {
  await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  await syncMapTokens(gameId, mapId);
  const kinds = options?.kinds ?? ['pc', 'monster'];

  const layoutKind = async (kind: 'pc' | 'monster') => {
    const tokens = await prisma.mapToken.findMany({
      where: { mapId, kind, zone: 'map' },
      include: mapTokenInclude,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    const living = tokens.filter((t) => !isMapTokenDead(t));
    const gridOptions = {
      anchorRightCol: options?.anchorRightCol,
      anchorLeftCol: options?.anchorLeftCol,
      anchorTopRow: options?.anchorTopRow,
      visibleLeft: options?.visibleLeft,
      visibleTop: options?.visibleTop,
      visibleRight: options?.visibleRight,
      visibleBottom: options?.visibleBottom,
    };
    const positions =
      kind === 'monster'
        ? computeUpperLeftTokenGrid(living.length, gridOptions)
        : computeUpperRightTokenGrid(living.length, gridOptions);
    for (let i = 0; i < living.length; i++) {
      const pos = positions[i]!;
      await prisma.mapToken.update({
        where: { id: living[i]!.id },
        data: { x: pos.x, y: pos.y, zone: 'map' },
      });
    }
  };

  for (const kind of kinds) {
    await layoutKind(kind);
  }

  return loadMapDto(mapId);
}

export async function getMapForLegacy(gameId: string) {
  const { maps, activeMapId } = await listGameMaps(gameId);
  const active = maps.find((m) => m.id === activeMapId) ?? maps[0] ?? null;
  return active;
}
