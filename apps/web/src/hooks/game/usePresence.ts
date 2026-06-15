import { useEffect, useState } from 'react';
import type { GamePresenceUser } from '../../types/game';

export function usePresence(gameId: string | undefined) {
  const [presenceUsers, setPresenceUsers] = useState<GamePresenceUser[]>([]);

  useEffect(() => {
    setPresenceUsers([]);
  }, [gameId]);

  return { presenceUsers, setPresenceUsers };
}

export type PresenceState = ReturnType<typeof usePresence>;
