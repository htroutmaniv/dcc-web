import {
  composeGameSettingsFromRecord,
  parseGameInitiativeState,
  type GameInitiativeState,
  type GameSettings,
} from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const gameWithSettingsInclude = {
  initiative: { select: { state: true, version: true } },
} as const;

export type GameWithSettings = Prisma.GameGetPayload<{
  include: typeof gameWithSettingsInclude;
}>;

export function readGameSettings(game: GameWithSettings): GameSettings {
  return composeGameSettingsFromRecord(game);
}

export function readInitiativeFromGame(game: GameWithSettings): GameInitiativeState | null {
  return parseGameInitiativeState(game.initiative?.state ?? null);
}

/** Attach composed `settings` for API / socket payloads (replaces removed JSON column). */
export function serializeGameForClient<T extends GameWithSettings>(
  game: T,
): Omit<T, 'initiative'> & { settings: GameSettings } {
  const { initiative: _initiative, ...rest } = game;
  return {
    ...rest,
    settings: readGameSettings(game),
  };
}

export async function loadGameWithSettings(gameId: string): Promise<GameWithSettings> {
  return prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: gameWithSettingsInclude,
  });
}

export async function loadGameSettings(gameId: string): Promise<GameSettings> {
  const game = await loadGameWithSettings(gameId);
  return readGameSettings(game);
}

export async function loadInitiativeState(
  gameId: string,
): Promise<GameInitiativeState | null> {
  const row = await prisma.gameInitiative.findUnique({
    where: { gameId },
    select: { state: true },
  });
  return parseGameInitiativeState(row?.state ?? null);
}

export async function saveInitiative(
  gameId: string,
  initiative: GameInitiativeState | null,
): Promise<GameSettings> {
  if (!initiative?.active) {
    await prisma.gameInitiative.deleteMany({ where: { gameId } });
  } else {
    await prisma.gameInitiative.upsert({
      where: { gameId },
      create: {
        gameId,
        state: initiative as unknown as Prisma.InputJsonValue,
        version: 1,
      },
      update: {
        state: initiative as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
  }
  return loadGameSettings(gameId);
}

export async function patchGameSettingsColumns(
  gameId: string,
  patch: {
    monstersVisibleOnMap?: boolean;
    sharedMonsterInitiative?: boolean;
    hideMonsterAcInRollLog?: boolean;
    gridFtPerCell?: number;
    playerTokenMovement?: 'free' | 'approval';
    activeMapId?: string | null;
  },
): Promise<GameSettings> {
  await prisma.game.update({
    where: { id: gameId },
    data: patch,
  });
  return loadGameSettings(gameId);
}

export async function setGameActiveMapId(
  gameId: string,
  mapId: string,
): Promise<string | null> {
  const map = await prisma.gameMap.findFirstOrThrow({ where: { id: mapId, gameId } });
  await prisma.game.update({
    where: { id: gameId },
    data: { activeMapId: map.id },
  });
  return map.id;
}
