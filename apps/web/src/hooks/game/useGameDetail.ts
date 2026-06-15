import { useCallback, useMemo, useState } from 'react';
import type { GameInitiativeState, GameSettings } from '@dcc-web/shared';
import { api, ApiError } from '../../api/client';
import type { GameDetail } from '../../types/game';
import { formatError } from '../../utils/errors';

type GameSettingsPatch = {
  monstersVisibleOnMap?: boolean;
  sharedMonsterInitiative?: boolean;
  hideMonsterAcInRollLog?: boolean;
};

export function useGameDetail(gameId: string | undefined) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiative, setInitiative] = useState<GameInitiativeState | null>(null);

  const isDm = detail?.isDm === true;

  const gameSettings = useMemo((): GameSettings | null => {
    if (!detail) return null;
    if (!detail.game.settings) {
      throw new Error('Game detail missing settings from API');
    }
    return detail.game.settings;
  }, [detail]);

  const applyInitiative = useCallback((next: GameInitiativeState | null) => {
    setInitiative(next);
    setDetail((prev) => {
      if (!prev?.game.settings) return prev;
      return {
        ...prev,
        game: {
          ...prev.game,
          settings: { ...prev.game.settings, initiative: next },
        },
      };
    });
  }, []);

  const applyGameSettingsPatch = useCallback((patch: GameSettingsPatch) => {
    setDetail((prev) => {
      if (!prev?.game.settings) return prev;
      return {
        ...prev,
        game: {
          ...prev.game,
          settings: { ...prev.game.settings, ...patch },
        },
      };
    });
  }, []);

  const loadDetail = useCallback(async () => {
    if (!gameId) return;
    const data = await api<GameDetail>(`/games/${gameId}`);
    if (!data.game.settings) {
      throw new Error('Game API response missing game.settings');
    }
    setDetail(data);
    setInitiative(data.game.settings.initiative);
    return data;
  }, [gameId]);

  const isAccessError = useCallback(
    (e: unknown) => e instanceof ApiError && (e.status === 403 || e.status === 404),
    [],
  );

  return {
    detail,
    setDetail,
    loading,
    setLoading,
    initiative,
    setInitiative,
    isDm,
    gameSettings,
    loadDetail,
    applyInitiative,
    applyGameSettingsPatch,
    formatLoadError: formatError,
    isAccessError,
  };
}

export type GameDetailState = ReturnType<typeof useGameDetail>;
