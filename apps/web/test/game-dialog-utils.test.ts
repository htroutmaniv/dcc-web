import { describe, expect, test } from 'bun:test';
import { parseCharacterResponse } from '../src/hooks/game/parse-character-response';
import {
  initialApplyDamageTab,
  resolveDefaultTargetLabel,
  tabForTargetType,
} from '../src/utils/apply-damage-dialog';

describe('parseCharacterResponse', () => {
  const character = {
    id: 'c1',
    name: 'Test',
    gameId: 'g1',
    ownerUserId: 'u1',
    status: 'alive' as const,
  };

  test('unwraps { character } envelope', () => {
    expect(parseCharacterResponse({ character })).toEqual(character);
  });

  test('accepts bare character', () => {
    expect(parseCharacterResponse(character)).toEqual(character);
  });

  test('returns null for bare object without id', () => {
    expect(parseCharacterResponse({} as typeof character)).toBeNull();
  });
});

describe('apply-damage dialog helpers', () => {
  test('tabForTargetType maps roll target types to tabs', () => {
    expect(tabForTargetType('character')).toBe('pc');
    expect(tabForTargetType('monster')).toBe('monster');
    expect(tabForTargetType('npc')).toBe('npc');
  });

  test('initialApplyDamageTab prefers roll target tab', () => {
    expect(initialApplyDamageTab({ type: 'character', id: 'c1' })).toBe('pc');
    expect(initialApplyDamageTab({ type: 'monster', id: 'm1' })).toBe('monster');
  });

  test('initialApplyDamageTab defaults to monster when no target', () => {
    expect(initialApplyDamageTab(null)).toBe('monster');
    expect(initialApplyDamageTab(undefined)).toBe('monster');
  });

  test('resolveDefaultTargetLabel finds names across target types', () => {
    const characters = [{ id: 'c1', name: 'Alice' }] as Parameters<
      typeof resolveDefaultTargetLabel
    >[1];
    const monsters = [{ id: 'm1', name: 'Goblin' }] as Parameters<
      typeof resolveDefaultTargetLabel
    >[2];
    const npcTokens = [{ id: 'n1', label: 'Guard' }] as Parameters<
      typeof resolveDefaultTargetLabel
    >[3];

    expect(
      resolveDefaultTargetLabel({ type: 'character', id: 'c1' }, characters, monsters, npcTokens),
    ).toBe('Alice');
    expect(
      resolveDefaultTargetLabel({ type: 'monster', id: 'm1' }, characters, monsters, npcTokens),
    ).toBe('Goblin');
    expect(
      resolveDefaultTargetLabel({ type: 'npc', id: 'n1' }, characters, monsters, npcTokens),
    ).toBe('Guard');
    expect(resolveDefaultTargetLabel(null, characters, monsters, npcTokens)).toBeNull();
  });
});
