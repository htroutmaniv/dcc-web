import { planMapTokenSync } from '../src/services/map-service.js';
import { describe, expect, test } from 'bun:test';

describe('planMapTokenSync', () => {
  const mapId = '00000000-0000-4000-8000-000000000001';

  test('creates tokens for visible alive characters', () => {
    const plan = planMapTokenSync(
      mapId,
      [
        {
          id: 'c1',
          status: 'alive',
          name: 'Alice',
          stats: { custom: { mapTokenVisible: true } },
        },
      ],
      [],
      [],
    );
    expect(plan.toDeleteIds).toEqual([]);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0]).toMatchObject({
      characterId: 'c1',
      label: 'Alice',
      kind: 'pc',
    });
  });

  test('deletes token when character hidden from map', () => {
    const plan = planMapTokenSync(
      mapId,
      [
        {
          id: 'c1',
          status: 'alive',
          name: 'Alice',
          stats: { custom: { mapTokenVisible: false } },
        },
      ],
      [],
      [
        {
          id: 't1',
          kind: 'pc',
          characterId: 'c1',
          monsterId: null,
          label: 'Alice',
          zone: 'map',
        },
      ],
    );
    expect(plan.toDeleteIds).toEqual(['t1']);
    expect(plan.toCreate).toHaveLength(0);
  });

  test('removes orphan monster tokens', () => {
    const plan = planMapTokenSync(mapId, [], [], [
      {
        id: 't1',
        kind: 'monster',
        characterId: null,
        monsterId: 'gone',
        label: 'Goblin',
        zone: 'map',
      },
    ]);
    expect(plan.toDeleteIds).toEqual(['t1']);
  });

  test('updates monster label when name changes', () => {
    const plan = planMapTokenSync(
      mapId,
      [],
      [{ id: 'm1', name: 'Goblin Chief', stats: { custom: { activeInPlay: true } } }],
      [
        {
          id: 't1',
          kind: 'monster',
          characterId: null,
          monsterId: 'm1',
          label: 'Goblin',
          zone: 'map',
        },
      ],
    );
    expect(plan.toUpdate).toEqual([{ id: 't1', data: { label: 'Goblin Chief' } }]);
  });
});
