import { describe, expect, test } from 'bun:test';
import { defaultMonsterSheet, parseMonsterSheet } from '../src/monsters/monster-sheet.js';

describe('parseMonsterSheet', () => {
  test('returns default sheet for invalid input', () => {
    const sheet = parseMonsterSheet(null);
    expect(sheet.attacks).toHaveLength(1);
    expect(sheet.attacks[0]?.id).toBe('primary');
    expect(sheet.specialAbilities).toEqual([]);
  });

  test('preserves intentionally empty attacks array', () => {
    const sheet = parseMonsterSheet({ attacks: [], specialAbilities: [] });
    expect(sheet.attacks).toEqual([]);
    expect(sheet.specialAbilities).toEqual([]);
  });

  test('filters invalid attack rows', () => {
    const sheet = parseMonsterSheet({
      attacks: [
        { id: 'a1', name: 'Bite', attackBonus: 2, damage: '1d6' },
        { id: 'bad', name: 123 },
      ],
      specialAbilities: [],
    });
    expect(sheet.attacks).toHaveLength(1);
    expect(sheet.attacks[0]?.name).toBe('Bite');
  });

  test('defaultMonsterSheet uses primary attack name', () => {
    const sheet = defaultMonsterSheet({ name: 'Claw', attackBonus: 3, damage: '1d8' });
    expect(sheet.attacks[0]).toMatchObject({
      name: 'Claw',
      attackBonus: 3,
      damage: '1d8',
    });
  });
});
