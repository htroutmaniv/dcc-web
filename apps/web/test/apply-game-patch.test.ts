import { describe, expect, test } from 'bun:test';
import { applyGamePatch } from '../src/hooks/game/apply-game-patch.js';
import type { Character, GameMonsterInstance } from '../src/types/game';
import type { TacticalGameMap } from '../src/types/map';

function createHandlers() {
  const calls = {
    characters: [] as Character[],
    monsters: [] as GameMonsterInstance[],
    maps: [] as TacticalGameMap[],
    tokens: [] as unknown[],
    initiative: [] as unknown[],
    settings: [] as unknown[],
    deletedCharacters: [] as string[],
    deletedMonsters: [] as string[],
    deletedMaps: [] as string[],
    deletedTokens: [] as string[],
    activeMapId: [] as (string | null)[],
  };

  const handlers = {
    applyCharacterFromServer: (c: Character) => {
      calls.characters.push(c);
    },
    setCharacters: (fn: (prev: Character[]) => Character[]) => {
      const prev = calls.characters.slice(-1);
      void fn(prev);
    },
    setSelectedCharacter: () => {},
    handleMonsterUpdated: (m: GameMonsterInstance) => {
      calls.monsters.push(m);
    },
    setMonsters: (fn: (prev: GameMonsterInstance[]) => GameMonsterInstance[]) => {
      void fn(calls.monsters);
    },
    setSelectedMonster: () => {},
    setMaps: (fn: (prev: TacticalGameMap[]) => TacticalGameMap[]) => {
      const removed = fn([]);
      if (removed.length === 0 && calls.deletedMaps.length > 0) {
        /* deleted map filter invoked */
      }
    },
    setActiveMapId: (id: string | null) => {
      calls.activeMapId.push(id);
    },
    applyMapFromServer: (map: TacticalGameMap) => {
      calls.maps.push(map);
    },
    applyMapTokenFromServer: (patch: unknown) => {
      calls.tokens.push(patch);
    },
    removeMapTokens: (ids: string[]) => {
      calls.deletedTokens.push(...ids);
    },
    applyInitiative: (next: unknown) => {
      calls.initiative.push(next);
    },
    applyGameSettingsPatch: (patch: unknown) => {
      calls.settings.push(patch);
    },
  };

  return { handlers, calls };
}

describe('applyGamePatch', () => {
  test('applies character upsert then map snapshot', () => {
    const { handlers, calls } = createHandlers();
    applyGamePatch(
      {
        characters: { upserted: [{ id: 'c1', name: 'Alice', status: 'alive' }] },
        map: { id: 'm1', tokens: [] },
      },
      handlers,
    );
    expect(calls.characters).toHaveLength(1);
    expect(calls.characters[0]?.id).toBe('c1');
    expect(calls.maps).toHaveLength(1);
    expect(calls.maps[0]?.id).toBe('m1');
  });

  test('applies monster delete and initiative clear', () => {
    const { handlers, calls } = createHandlers();
    applyGamePatch(
      {
        monsters: { deletedIds: ['x1'] },
        initiative: null,
      },
      handlers,
    );
    expect(calls.initiative).toEqual([null]);
  });

  test('applies token upsert', () => {
    const { handlers, calls } = createHandlers();
    applyGamePatch(
      {
        tokens: {
          upserted: [{ id: 't1', mapId: 'm1', x: 2, y: 3, zone: 'map' }],
        },
      },
      handlers,
    );
    expect(calls.tokens).toHaveLength(1);
  });

  test('throws on invalid patch and does not partially apply', () => {
    const { handlers, calls } = createHandlers();
    expect(() =>
      applyGamePatch({ characters: { upserted: [{ noId: true }] } }, handlers),
    ).toThrow();
    expect(calls.characters).toHaveLength(0);
  });
});
