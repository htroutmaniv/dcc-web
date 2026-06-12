import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  leaveGameRoom,
  subscribeGameDeleted,
  type GameDeletedPayload,
} from '../lib/game-socket-client';

interface UseGameDeleteNotificationsOptions {
  /** When set, navigate home if this game is deleted. */
  gameId?: string;
  /** Called for every deleted game (e.g. refresh home list). */
  onGameRemoved?: (payload: GameDeletedPayload) => void;
}

export function useGameDeleteNotifications({
  gameId,
  onGameRemoved,
}: UseGameDeleteNotificationsOptions = {}): void {
  const { user } = useAuth();
  const navigate = useNavigate();
  const onGameRemovedRef = useRef(onGameRemoved);
  onGameRemovedRef.current = onGameRemoved;

  useEffect(() => {
    if (!user) return;

    return subscribeGameDeleted((payload) => {
      if (!payload.gameId) return;

      onGameRemovedRef.current?.(payload);

      if (gameId && payload.gameId === gameId) {
        leaveGameRoom(gameId);
        const deletedByYou = payload.actorUserId === user.id;
        navigate('/', {
          replace: true,
          state: {
            info: deletedByYou
              ? 'Game deleted.'
              : 'This game was deleted by the DM.',
            removedGameId: payload.gameId,
          },
        });
      }
    });
  }, [user, gameId, navigate]);
}
