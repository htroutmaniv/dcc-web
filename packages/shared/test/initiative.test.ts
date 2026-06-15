import { describe, expect, test } from 'bun:test';
import {
  advanceInitiativeTurn,
  createCharacterInitiativeSkipFn,
  getCurrentTurnEntry,
  isCharacterTurn,
  normalizeInitiativeTurnIndex,
  type GameInitiativeState,
  type InitiativeEntry,
} from '../src/initiative.js';

function charEntry(id: string, initiative: number): InitiativeEntry {
  return {
    entryId: id,
    kind: 'character',
    characterId: id,
    name: id,
    initiative,
  };
}

function baseState(order: InitiativeEntry[], turnIndex = 0, round = 1): GameInitiativeState {
  return { active: true, round, turnIndex, order };
}

describe('getCurrentTurnEntry', () => {
  test('returns entry at turnIndex modulo length', () => {
    const state = baseState([charEntry('a', 10), charEntry('b', 5)], 1);
    expect(getCurrentTurnEntry(state)?.characterId).toBe('b');
  });

  test('skips inactive entries when shouldSkip provided', () => {
    const state = baseState([charEntry('dead', 10), charEntry('alive', 5)], 0);
    const skip = createCharacterInitiativeSkipFn([
      { id: 'dead', level: 1, status: 'dead' },
      { id: 'alive', level: 1, status: 'alive', combat: { hpCurrent: 5 } },
    ]);
    expect(getCurrentTurnEntry(state, skip)?.characterId).toBe('alive');
  });
});

describe('isCharacterTurn', () => {
  test('true only for current character entry', () => {
    const state = baseState([charEntry('a', 10), charEntry('b', 5)], 0);
    expect(isCharacterTurn(state, 'a')).toBe(true);
    expect(isCharacterTurn(state, 'b')).toBe(false);
  });
});

describe('advanceInitiativeTurn', () => {
  test('increments turnIndex within round', () => {
    const state = baseState([charEntry('a', 10), charEntry('b', 5)], 0);
    const next = advanceInitiativeTurn(state);
    expect(next.turnIndex).toBe(1);
    expect(next.round).toBe(1);
  });

  test('wraps to next round at end of order', () => {
    const state = baseState([charEntry('a', 10), charEntry('b', 5)], 1);
    const next = advanceInitiativeTurn(state);
    expect(next.turnIndex).toBe(0);
    expect(next.round).toBe(2);
  });

  test('skips dead characters when advancing', () => {
    const state = baseState([charEntry('dead', 10), charEntry('alive', 5)], 0);
    const skip = createCharacterInitiativeSkipFn([
      { id: 'dead', level: 1, status: 'dead' },
      { id: 'alive', level: 1, status: 'alive', combat: { hpCurrent: 5 } },
    ]);
    const next = advanceInitiativeTurn(state, skip);
    expect(next.turnIndex).toBe(1);
    expect(getCurrentTurnEntry(next, skip)?.characterId).toBe('alive');
  });
});

describe('normalizeInitiativeTurnIndex', () => {
  test('advances past skipped entry at current index', () => {
    const state = baseState([charEntry('dead', 10), charEntry('alive', 5)], 0);
    const skip = createCharacterInitiativeSkipFn([
      { id: 'dead', level: 1, status: 'dead' },
      { id: 'alive', level: 1, status: 'alive', combat: { hpCurrent: 5 } },
    ]);
    const normalized = normalizeInitiativeTurnIndex(state, skip);
    expect(getCurrentTurnEntry(normalized, skip)?.characterId).toBe('alive');
  });
});

describe('createCharacterInitiativeSkipFn', () => {
  test('does not skip monster entries', () => {
    const skip = createCharacterInitiativeSkipFn([]);
    const monster: InitiativeEntry = {
      entryId: 'm1',
      kind: 'monster',
      monsterId: 'm1',
      name: 'Goblin',
      initiative: 8,
    };
    expect(skip(monster)).toBe(false);
  });
});
