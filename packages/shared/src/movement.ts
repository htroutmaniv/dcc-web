import { parseGameInitiative } from './initiative.js';
import type { CharacterStats, GameSettings, MovementRange } from './types.js';
import { DEFAULT_GAME_SETTINGS } from './types.js';

export function parseGameSettings(settings: unknown): GameSettings {
  const s = (
    settings != null && typeof settings === 'object' ? settings : {}
  ) as Partial<GameSettings>;
  const raw = s as { activeMapId?: string | null };
  return {
    gridFtPerCell: s.gridFtPerCell ?? DEFAULT_GAME_SETTINGS.gridFtPerCell,
    playerTokenMovement:
      s.playerTokenMovement ?? DEFAULT_GAME_SETTINGS.playerTokenMovement,
    initiative: parseGameInitiative(settings),
    activeMapId:
      typeof raw.activeMapId === 'string' && raw.activeMapId.length > 0
        ? raw.activeMapId
        : null,
    monstersVisibleOnMap:
      typeof s.monstersVisibleOnMap === 'boolean'
        ? s.monstersVisibleOnMap
        : DEFAULT_GAME_SETTINGS.monstersVisibleOnMap,
  };
}

/** Compute movement radius in feet from character stats (DCC-simplified). */
export function computeMovementFeet(stats: CharacterStats): number {
  let feet = stats.speed ?? 30;
  feet -= stats.armorSpeedPenalty ?? 0;
  for (const m of stats.movementModifiers ?? []) {
    feet += m.feet;
  }
  return Math.max(0, feet);
}

export function movementRangeFromStats(
  stats: CharacterStats,
  gridFtPerCell: number,
): MovementRange {
  const feet = computeMovementFeet(stats);
  return {
    feet,
    cells: gridFtPerCell > 0 ? feet / gridFtPerCell : 0,
    gridFtPerCell,
  };
}
