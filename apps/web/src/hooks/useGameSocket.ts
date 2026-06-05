import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { registerGameSocket, unregisterGameSocket } from '../lib/game-socket-client';
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

    const socket: Socket = io(window.location.origin, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    const onConnect = () => {
      socket.emit('game:join', { gameId });
    };

    socket.on('connect', onConnect);

    socket.on('game:joined', () => {
      registerGameSocket(socket, gameId);
      handlersRef.current.onConnected?.();
    });

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

    socket.on('game:error', (payload: { message?: string }) => {
      console.warn('[game socket]', payload?.message ?? 'error');
    });

    return () => {
      socket.off('connect', onConnect);
      unregisterGameSocket(socket);
      if (socket.connected) {
        socket.emit('game:leave', { gameId });
      }
      socket.disconnect();
    };
  }, [gameId, enabled]);
}
