import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import {
  joinGameRoom,
  registerGameSocket,
  unregisterGameSocket,
} from '../lib/game-socket-client';
import type { GameInitiativeState } from '@dcc-web/shared';
import type { Character, DiceResult, GamePresenceUser } from '../types/game';
import type { DiceRollLogEntry } from '../types/dice-roll-log';

export interface GameSocketHandlers {
  /** Fired when socket connects and joins the game room — good time to resync. */
  onConnected?: () => void;
  onCharacterUpsert?: (character: Character, actorUserId?: string) => void;
  onInitiativeUpdated?: (
    initiative: GameInitiativeState | null,
    actorUserId?: string,
  ) => void;
  onDiceRolled?: (payload: {
    result: DiceRollLogEntry | DiceResult;
    characterId?: string;
    actorUserId?: string;
  }) => void;
  onMonstersChanged?: (actorUserId?: string) => void;
  onDamageApplied?: (payload: {
    targetType: string;
    targetId: string;
    amount: number;
    hpAfter: number;
    targetName: string;
  }) => void;
  onTokenUpdated?: (token: unknown) => void;
  onMapUpdated?: (actorUserId?: string) => void;
  onPresenceUpdated?: (users: GamePresenceUser[]) => void;
  onRosterChanged?: (actorUserId?: string) => void;
  onSettingsUpdated?: (settings: unknown) => void;
  onGameDeleted?: (payload: { gameId?: string; actorUserId?: string }) => void;
}

/**
 * Subscribe to real-time game events (Socket.IO). Uses session cookie auth.
 */
export function useGameSocket(
  gameId: string | undefined,
  handlers: GameSocketHandlers,
  enabled = true,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!gameId || !enabled) return;

    const socket: Socket = registerGameSocket(gameId);

    const onGameJoined = (payload: { gameId?: string }) => {
      if (payload?.gameId !== gameId) return;
      handlersRef.current.onConnected?.();
    };

    socket.on('game:joined', onGameJoined);

    socket.on(
      'character:upsert',
      (payload: { character: Character; actorUserId?: string }) => {
        if (payload?.character) {
          handlersRef.current.onCharacterUpsert?.(
            payload.character,
            payload.actorUserId,
          );
        }
      },
    );

    socket.on(
      'initiative:updated',
      (payload: { initiative: GameInitiativeState | null; actorUserId?: string }) => {
        handlersRef.current.onInitiativeUpdated?.(
          payload?.initiative ?? null,
          payload.actorUserId,
        );
      },
    );

    socket.on('monsters:changed', (payload: { actorUserId?: string }) => {
      handlersRef.current.onMonstersChanged?.(payload?.actorUserId);
    });

    socket.on('damage:applied', (payload) => {
      handlersRef.current.onDamageApplied?.(payload);
    });

    socket.on('token:updated', (payload: { token?: unknown }) => {
      if (payload?.token) handlersRef.current.onTokenUpdated?.(payload.token);
    });

    socket.on('map:updated', (payload: { actorUserId?: string }) => {
      handlersRef.current.onMapUpdated?.(payload?.actorUserId);
    });

    socket.on('map:token_moved', () => {
      handlersRef.current.onMapUpdated?.();
    });

    socket.on(
      'dice:rolled',
      (payload: {
        result: DiceResult;
        characterId?: string;
        actorUserId?: string;
      }) => {
        if (payload?.result) {
          handlersRef.current.onDiceRolled?.(payload);
        }
      },
    );

    socket.on('game:presence', (payload: { users?: GamePresenceUser[] }) => {
      if (Array.isArray(payload?.users)) {
        handlersRef.current.onPresenceUpdated?.(payload.users);
      }
    });

    socket.on('game:roster_changed', (payload: { actorUserId?: string }) => {
      handlersRef.current.onRosterChanged?.(payload?.actorUserId);
    });

    socket.on(
      'game:settings_updated',
      (payload: { settings?: unknown; actorUserId?: string }) => {
        if (payload?.settings) {
          handlersRef.current.onSettingsUpdated?.(payload.settings);
        }
      },
    );

    socket.on('game:deleted', (payload: { gameId?: string; actorUserId?: string }) => {
      handlersRef.current.onGameDeleted?.(payload);
    });

    socket.on('game:error', (payload: { message?: string }) => {
      console.warn('[game socket]', payload?.message ?? 'error');
    });

    socket.on('connect_error', (err: Error) => {
      console.warn('[game socket] connect_error', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      if (reason !== 'io client disconnect') {
        console.warn('[game socket] disconnected:', reason);
      }
    });

    joinGameRoom(gameId);

    return () => {
      socket.off('game:joined', onGameJoined);
      socket.off('character:upsert');
      socket.off('initiative:updated');
      socket.off('monsters:changed');
      socket.off('damage:applied');
      socket.off('token:updated');
      socket.off('map:updated');
      socket.off('map:token_moved');
      socket.off('dice:rolled');
      socket.off('game:presence');
      socket.off('game:roster_changed');
      socket.off('game:settings_updated');
      socket.off('game:deleted');
      socket.off('game:error');
      socket.off('connect_error');
      socket.off('disconnect');
      unregisterGameSocket(gameId);
    };
  }, [gameId, enabled]);
}
