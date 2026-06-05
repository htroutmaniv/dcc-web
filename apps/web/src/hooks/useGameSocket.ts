import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameInitiativeState } from '@dcc-web/shared';
import type { Character, DiceResult } from '../types/game';

export interface GameSocketHandlers {
  /** Fired when socket connects and joins the game room — good time to resync. */
  onConnected?: () => void;
  onCharacterUpsert?: (character: Character, actorUserId?: string) => void;
  onInitiativeUpdated?: (
    initiative: GameInitiativeState | null,
    actorUserId?: string,
  ) => void;
  onDiceRolled?: (payload: {
    result: DiceResult;
    characterId?: string;
    actorUserId?: string;
  }) => void;
  onMonstersChanged?: (actorUserId?: string) => void;
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

    socket.on('game:error', (payload: { message?: string }) => {
      console.warn('[game socket]', payload?.message ?? 'error');
    });

    return () => {
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, [gameId, enabled]);
}
