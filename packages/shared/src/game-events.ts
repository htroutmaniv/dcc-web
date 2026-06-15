import type { GameInitiativeState } from './initiative/initiative.js';
import type { GameSettings } from './types.js';

/** Realtime payloads emitted to the `game:{gameId}` Socket.IO room. */
export type GameEvent =
  | { type: 'character:upsert'; character: unknown; actorUserId?: string }
  | {
      type: 'initiative:updated';
      initiative: GameInitiativeState | null;
      actorUserId?: string;
    }
  | { type: 'monsters:changed'; monsterIds?: string[]; actorUserId?: string }
  | { type: 'map:updated'; actorUserId?: string }
  | { type: 'map:tokens_reset'; tokens: unknown[]; actorUserId?: string }
  | {
      type: 'map:cleared';
      map: unknown;
      tokens: unknown[];
      actorUserId?: string;
    }
  | { type: 'map:token_moved'; token: unknown; actorUserId?: string }
  | { type: 'movement:pending'; request: unknown; actorUserId?: string }
  | {
      type: 'movement:resolved';
      request: unknown;
      token: unknown | null;
      actorUserId?: string;
    }
  | {
      type: 'dice:rolled';
      result: unknown;
      characterId?: string;
      actorUserId?: string;
    }
  | {
      type: 'damage:applied';
      targetType: string;
      targetId: string;
      amount: number;
      hpAfter: number;
      targetName: string;
      rollLogId?: string;
      actorUserId?: string;
    }
  | { type: 'token:updated'; token: unknown; actorUserId?: string }
  | { type: 'game:presence'; users: unknown[] }
  | { type: 'game:roster_changed'; actorUserId?: string }
  | { type: 'game:settings_updated'; settings: GameSettings; actorUserId?: string };

export type GameEventType = GameEvent['type'];

/** Strip the discriminant for Socket.IO payload (event name = type). */
export type GameEventPayload<E extends GameEvent> = Omit<E, 'type'>;
