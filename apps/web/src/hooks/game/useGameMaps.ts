import { useCallback, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { MapTokenTarget } from '../../components/ApplyDamageDialog';
import type { TacticalGameMap } from '../../types/map';

export function useGameMaps(gameId: string | undefined) {
  const [maps, setMaps] = useState<TacticalGameMap[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapBusy, setMapBusy] = useState(false);
  const [npcTokens, setNpcTokens] = useState<MapTokenTarget[]>([]);

  const syncNpcTokensFromMap = useCallback((map: TacticalGameMap | null) => {
    setNpcTokens(
      (map?.tokens ?? [])
        .filter((t) => t.kind === 'npc')
        .map((t) => ({
          id: t.id,
          label: t.label,
          kind: t.kind,
          hpCurrent: t.hpCurrent,
          hpMax: t.hpMax,
        })),
    );
  }, []);

  const loadMaps = useCallback(async () => {
    if (!gameId) return;
    const data = await api<{ maps: TacticalGameMap[]; activeMapId: string | null }>(
      `/games/${gameId}/maps`,
    );
    setMaps(data.maps);
    setActiveMapId(data.activeMapId);
    const active = data.maps.find((m) => m.id === data.activeMapId) ?? data.maps[0] ?? null;
    syncNpcTokensFromMap(active);
    return data;
  }, [gameId, syncNpcTokensFromMap]);

  const applyMapFromServer = useCallback(
    (map: TacticalGameMap) => {
      setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
      if (map.id === activeMapId) syncNpcTokensFromMap(map);
    },
    [activeMapId, syncNpcTokensFromMap],
  );

  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? maps[0] ?? null,
    [maps, activeMapId],
  );

  return {
    maps,
    setMaps,
    activeMapId,
    setActiveMapId,
    mapBusy,
    setMapBusy,
    npcTokens,
    activeMap,
    loadMaps,
    syncNpcTokensFromMap,
    applyMapFromServer,
  };
}

export type GameMapsState = ReturnType<typeof useGameMaps>;
