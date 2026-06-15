import { describe, expect, test } from 'bun:test';
import { buildCombatTargetOptions } from '../src/utils/combat-target-options';

describe('buildCombatTargetOptions', () => {
  test('includes in-play living monsters only', () => {
    const options = buildCombatTargetOptions(
      [
        {
          id: 'm1',
          name: 'Goblin',
          ac: 12,
          hpCurrent: 5,
          stats: { custom: { activeInPlay: true } },
        },
        {
          id: 'm2',
          name: 'Dead goblin',
          ac: 12,
          hpCurrent: 0,
          stats: { custom: { killed: true, activeInPlay: true } },
        },
      ] as Parameters<typeof buildCombatTargetOptions>[0],
      [],
    );
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ type: 'monster', id: 'm1', label: 'Goblin', ac: 12 });
  });

  test('includes npc tokens with default AC', () => {
    const options = buildCombatTargetOptions([], [{ id: 'n1', label: 'Guard' }]);
    expect(options).toEqual([{ type: 'npc', id: 'n1', label: 'Guard', ac: 10 }]);
  });
});
