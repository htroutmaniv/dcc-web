import { describe, expect, test } from 'bun:test';
import {
  getCharacterVitality,
  MORTAL_ROUNDS_KEY,
  resolveCharacterCombatAfterHpChange,
  resolveMonsterAfterHpChange,
  tickMortalRound,
} from '../src/combat/combat-mortality.js';

describe('getCharacterVitality', () => {
  test('level 0 dies immediately at 0 HP', () => {
    expect(
      getCharacterVitality({
        level: 0,
        status: 'alive',
        combat: { hpCurrent: 0 },
      }),
    ).toBe('dead');
  });

  test('level 1+ enters dying at 0 HP', () => {
    expect(
      getCharacterVitality({
        level: 2,
        status: 'alive',
        combat: { hpCurrent: 0 },
      }),
    ).toBe('dying');
  });

  test('respects status dead', () => {
    expect(
      getCharacterVitality({
        level: 2,
        status: 'dead',
        combat: { hpCurrent: 5 },
      }),
    ).toBe('dead');
  });
});

describe('resolveCharacterCombatAfterHpChange', () => {
  test('sets mortal rounds when dropping to 0 HP at level 1+', () => {
    const { combat, markDead } = resolveCharacterCombatAfterHpChange({
      level: 3,
      status: 'alive',
      hpBefore: 5,
      hpAfter: 0,
      combat: { hpCurrent: 5, hpMax: 10 },
    });
    expect(markDead).toBe(false);
    expect(combat.hpCurrent).toBe(0);
    expect(combat.custom?.[MORTAL_ROUNDS_KEY]).toBe(3);
  });

  test('marks dead for level 0 at 0 HP', () => {
    const { markDead } = resolveCharacterCombatAfterHpChange({
      level: 0,
      status: 'alive',
      hpBefore: 2,
      hpAfter: 0,
      combat: { hpCurrent: 2 },
    });
    expect(markDead).toBe(true);
  });
});

describe('tickMortalRound', () => {
  test('counts down mortal rounds then marks dead', () => {
    const dying = {
      hpCurrent: 0,
      custom: { [MORTAL_ROUNDS_KEY]: 1 },
    };
    const { markDead } = tickMortalRound(dying, 2);
    expect(markDead).toBe(true);
  });
});

describe('resolveMonsterAfterHpChange', () => {
  test('marks killed at 0 HP', () => {
    const result = resolveMonsterAfterHpChange(0, {});
    expect(result.killed).toBe(true);
    expect(result.hpCurrent).toBe(0);
  });

  test('clears killed flag when HP restored', () => {
    const result = resolveMonsterAfterHpChange(5, { custom: { killed: true } });
    expect(result.killed).toBe(false);
    expect(result.hpCurrent).toBe(5);
  });
});
