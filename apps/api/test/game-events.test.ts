import { describe, expect, test } from 'bun:test';
import type { GameEvent } from '@dcc-web/shared';
import { publish } from '../src/lib/game-events.js';

describe('publish', () => {
  test('emits typed event name with payload minus type', () => {
    const emitted: { event: string; payload: unknown }[] = [];
    const io = {
      to: () => ({
        emit: (event: string, payload: unknown) => {
          emitted.push({ event, payload });
        },
      }),
    };

    const event: GameEvent = {
      type: 'monsters:changed',
      monsterIds: ['m1'],
      actorUserId: 'u1',
    };
    publish(io as never, 'game-1', event);

    expect(emitted).toEqual([
      {
        event: 'monsters:changed',
        payload: { gameId: 'game-1', monsterIds: ['m1'], actorUserId: 'u1' },
      },
    ]);
  });
});
