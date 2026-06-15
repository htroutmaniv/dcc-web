import {
  composeGameSettingsFromRecord,
  parseGameInitiativeState,
  type GameInitiativeState,
  type GameSettings,
} from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import { OptimisticLockConflict, withOptimisticRetry } from '../lib/optimistic.js';
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export type InitiativeMutator = (
  current: GameInitiativeState | null,
) => GameInitiativeState | null | Promise<GameInitiativeState | null>;

/** Read-modify-write initiative with version-checked updates and automatic retry. */
export async function mutateInitiative(
  gameId: string,
  mutate: InitiativeMutator,
): Promise<{ settings: GameSettings; initiative: GameInitiativeState | null }> {
  return withOptimisticRetry(async () => {
    const row = await prisma.gameInitiative.findUnique({
      where: { gameId },
      select: { state: true, version: true },
    });
    const current = row ? parseGameInitiativeState(row.state) : null;
    const next = await mutate(current);

    if (!next?.active) {
      if (row) {
        const deleted = await prisma.gameInitiative.deleteMany({
          where: { gameId, version: row.version },
        });
        if (deleted.count === 0) {
          throw new OptimisticLockConflict(`Initiative delete lost race for game ${gameId}`);
        }
      }
      return { settings: await loadGameSettings(gameId), initiative: null };
    }

    if (!row) {
      try {
        await prisma.gameInitiative.create({
          data: {
            gameId,
            state: next as unknown as Prisma.InputJsonValue,
            version: 1,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new OptimisticLockConflict(`Initiative create lost race for game ${gameId}`);
        }
        throw error;
      }
    } else {
      const updated = await prisma.gameInitiative.updateMany({
        where: { gameId, version: row.version },
        data: {
          state: next as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new OptimisticLockConflict(`Initiative update lost race for game ${gameId}`);
      }
    }

    return { settings: await loadGameSettings(gameId), initiative: next };
  });
}

export async function saveInitiative(
  gameId: string,
  initiative: GameInitiativeState | null,
): Promise<GameSettings> {
  const { settings } = await mutateInitiative(gameId, () => initiative);
  return settings;
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
