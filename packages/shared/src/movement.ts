import { parseGameInitiativeState } from './initiative.js';
import type { CharacterStats, GameSettings, MovementRange, PlayerTokenMovement } from './types.js';

/** DB row shape for composing {@link GameSettings} (settings JSON column removed). */
export type GameSettingsRecord = {
  activeMapId: string | null;
  monstersVisibleOnMap: boolean;
  sharedMonsterInitiative: boolean;
  hideMonsterAcInRollLog: boolean;
  gridFtPerCell: number | string | { toString(): string };
  playerTokenMovement: PlayerTokenMovement | string;
  initiative?: { state: unknown } | null;
};

function requireBoolean(field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid game settings: ${field} must be a boolean, got ${typeof value}`);
  }
  return value;
}

function requirePlayerTokenMovement(value: unknown): PlayerTokenMovement {
  if (value !== 'free' && value !== 'approval') {
    throw new Error(
      `Invalid game settings: playerTokenMovement must be "free" or "approval", got ${String(value)}`,
    );
  }
  return value;
}

function requireGridFtPerCell(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `Invalid game settings: gridFtPerCell must be a positive number, got ${String(value)}`,
    );
  }
  return n;
}

function parseActiveMapId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && value.length > 0) return value;
  throw new Error(
    `Invalid game settings: activeMapId must be null or a non-empty string, got ${String(value)}`,
  );
}

export function composeGameSettingsFromRecord(record: GameSettingsRecord): GameSettings {
  return {
    gridFtPerCell: requireGridFtPerCell(record.gridFtPerCell),
    playerTokenMovement: requirePlayerTokenMovement(record.playerTokenMovement),
    initiative: parseGameInitiativeState(record.initiative?.state ?? null),
    activeMapId: parseActiveMapId(record.activeMapId),
    monstersVisibleOnMap: requireBoolean('monstersVisibleOnMap', record.monstersVisibleOnMap),
    sharedMonsterInitiative: requireBoolean(
      'sharedMonsterInitiative',
      record.sharedMonsterInitiative,
    ),
    hideMonsterAcInRollLog: requireBoolean(
      'hideMonsterAcInRollLog',
      record.hideMonsterAcInRollLog,
    ),
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
