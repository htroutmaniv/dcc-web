import { describe, expect, test } from 'bun:test';
import {
  computeMovementFeet,
  movementRangeFromStats,
  parseGameSettings,
} from '../src/movement.js';
import { DEFAULT_GAME_SETTINGS } from '../src/types.js';
import type { CharacterStats } from '../src/types.js';

const baseStats: CharacterStats = {
  abilities: {},
  speed: 30,
};

describe('parseGameSettings', () => {
  test('returns defaults for null/undefined', () => {
    const s = parseGameSettings(null);
    expect(s.gridFtPerCell).toBe(DEFAULT_GAME_SETTINGS.gridFtPerCell);
    expect(s.playerTokenMovement).toBe(DEFAULT_GAME_SETTINGS.playerTokenMovement);
    expect(s.monstersVisibleOnMap).toBe(false);
    expect(s.initiative).toBeNull();
    expect(s.activeMapId).toBeNull();
  });

  test('parses initiative nested in settings blob', () => {
    const s = parseGameSettings({
      initiative: {
        active: true,
        round: 2,
        turnIndex: 1,
        order: [
          {
            entryId: 'c1',
            kind: 'character',
            characterId: 'c1',
            name: 'Hero',
            initiative: 14,
          },
        ],
      },
    });
    expect(s.initiative?.active).toBe(true);
    expect(s.initiative?.round).toBe(2);
    expect(s.initiative?.order).toHaveLength(1);
  });

  test('reads DM flags and activeMapId', () => {
    const s = parseGameSettings({
      monstersVisibleOnMap: true,
      sharedMonsterInitiative: true,
      hideMonsterAcInRollLog: true,
      activeMapId: 'map-uuid',
    });
    expect(s.monstersVisibleOnMap).toBe(true);
    expect(s.sharedMonsterInitiative).toBe(true);
    expect(s.hideMonsterAcInRollLog).toBe(true);
    expect(s.activeMapId).toBe('map-uuid');
  });
});

describe('computeMovementFeet', () => {
  test('applies armor penalty and modifiers', () => {
    const feet = computeMovementFeet({
      ...baseStats,
      armorSpeedPenalty: 10,
      movementModifiers: [{ label: 'haste', feet: 5 }],
    });
    expect(feet).toBe(25);
  });

  test('never goes below zero', () => {
    expect(
      computeMovementFeet({
        ...baseStats,
        speed: 5,
        armorSpeedPenalty: 20,
      }),
    ).toBe(0);
  });
});

describe('movementRangeFromStats', () => {
  test('converts feet to grid cells', () => {
    const range = movementRangeFromStats(baseStats, 5);
    expect(range.feet).toBe(30);
    expect(range.cells).toBe(6);
    expect(range.gridFtPerCell).toBe(5);
  });

  test('returns zero cells when gridFtPerCell is zero', () => {
    const range = movementRangeFromStats(baseStats, 0);
    expect(range.cells).toBe(0);
  });
});
