import { describe, expect, test } from 'bun:test';
import {
  computeMovementFeet,
  movementRangeFromStats,
  composeGameSettingsFromRecord,
} from '../src/movement.js';
import type { CharacterStats } from '../src/types.js';

const baseStats: CharacterStats = {
  abilities: {},
  speed: 30,
};

const validRecord = {
  activeMapId: null as string | null,
  monstersVisibleOnMap: false,
  sharedMonsterInitiative: false,
  hideMonsterAcInRollLog: false,
  gridFtPerCell: 5,
  playerTokenMovement: 'free' as const,
};

describe('composeGameSettingsFromRecord', () => {
  test('reads DB columns', () => {
    const s = composeGameSettingsFromRecord({
      ...validRecord,
      activeMapId: 'map-1',
      monstersVisibleOnMap: true,
      gridFtPerCell: 10,
      playerTokenMovement: 'approval',
      initiative: {
        state: {
          active: true,
          round: 1,
          turnIndex: 0,
          order: [
            {
              entryId: 'c1',
              kind: 'character',
              characterId: 'c1',
              name: 'Hero',
              initiative: 12,
            },
          ],
        },
      },
    });
    expect(s.gridFtPerCell).toBe(10);
    expect(s.playerTokenMovement).toBe('approval');
    expect(s.activeMapId).toBe('map-1');
    expect(s.monstersVisibleOnMap).toBe(true);
    expect(s.initiative?.order).toHaveLength(1);
  });

  test('throws when required boolean fields are missing', () => {
    expect(() =>
      composeGameSettingsFromRecord({
        ...validRecord,
        monstersVisibleOnMap: undefined as unknown as boolean,
      }),
    ).toThrow(/monstersVisibleOnMap/);
  });

  test('throws when gridFtPerCell is invalid', () => {
    expect(() =>
      composeGameSettingsFromRecord({
        ...validRecord,
        gridFtPerCell: 0,
      }),
    ).toThrow(/gridFtPerCell/);
  });

  test('throws when playerTokenMovement is invalid', () => {
    expect(() =>
      composeGameSettingsFromRecord({
        ...validRecord,
        playerTokenMovement: 'invalid',
      }),
    ).toThrow(/playerTokenMovement/);
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
