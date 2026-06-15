import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCharacterInitiativeSkipFn,
  fitImageToGrid,
  getCharacterLightRadiusFeet,
  getCurrentTurnEntry,
  isCharacterTurn,
  isMonsterTokenTurn,
  movementRangeFromStats,
  type GameInitiativeState,
  type MapDrawTool,
  type MapLayoutAnchor,
  type CharacterStats as SharedCharacterStats,
} from '@dcc-web/shared';
import { api, apiFormData } from '../../api/client';
import type { Character, GameMonsterInstance } from '../../types/game';
import type { CorpseLootTarget } from '../../components/inventory/CorpseLootSheet';
import type { TokenMapOverlay } from '../../types/token-overlay';
import type { TacticalGameMap, TacticalMapToken } from '../../types/map';
import { formatError } from '../../utils/errors';
import { parseMapTokenPatch } from '../../utils/map-token-patch';
import type { MapTokenPatch } from '../../utils/map-token-patch';

export type MapActionsDeps = {
  gameId: string | undefined;
  isDm: boolean;
  userId: string | undefined;
  detailLoaded: boolean;
  characters: Character[];
  monsters: GameMonsterInstance[];
  initiative: GameInitiativeState | null;
  initiativeActive: boolean;
  maps: TacticalGameMap[];
  setMaps: React.Dispatch<React.SetStateAction<TacticalGameMap[]>>;
  activeMapId: string | null;
  setActiveMapId: React.Dispatch<React.SetStateAction<string | null>>;
  activeMap: TacticalGameMap | null;
  mapBusy: boolean;
  setMapBusy: React.Dispatch<React.SetStateAction<boolean>>;
  loadMaps: () => Promise<unknown>;
  syncNpcTokensFromMap: (map: TacticalGameMap | null) => void;
  applyMapFromServer: (map: TacticalGameMap) => void;
  applyMapTokenFromServer: (patch: MapTokenPatch) => void;
  onError: (message: string | null) => void;
  setCorpseLootRef: React.Dispatch<
    React.SetStateAction<{ kind: 'character' | 'monster'; id: string } | null>
  >;
  setCorpseLootOpen: React.Dispatch<React.SetStateAction<boolean>>;
  corpseLootRef: { kind: 'character' | 'monster'; id: string } | null;
};

export function useMapActions(deps: MapActionsDeps) {
  const {
    gameId,
    isDm,
    userId,
    detailLoaded,
    characters,
    monsters,
    initiative,
    initiativeActive,
    maps,
    setMaps,
    activeMapId,
    setActiveMapId,
    activeMap,
    setMapBusy,
    loadMaps,
    syncNpcTokensFromMap,
    applyMapFromServer,
    applyMapTokenFromServer,
    onError,
    setCorpseLootRef,
    setCorpseLootOpen,
    corpseLootRef,
  } = deps;

  const [drawTool, setDrawTool] = useState<MapDrawTool>('select');
  const [drawColor, setDrawColor] = useState('#c9a227');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(2);

  const shouldSkipInitiative = useMemo(
    () => createCharacterInitiativeSkipFn(characters),
    [characters],
  );

  const gridFt = activeMap?.gridFtPerCell ?? 5;

  const corpseLootTarget = useMemo((): CorpseLootTarget | null => {
    if (!corpseLootRef) return null;
    if (corpseLootRef.kind === 'character') {
      const character = characters.find((c) => c.id === corpseLootRef.id);
      return character ? { kind: 'character', character } : null;
    }
    const monster = monsters.find((m) => m.id === corpseLootRef.id);
    return monster ? { kind: 'monster', monster } : null;
  }, [corpseLootRef, characters, monsters]);

  const isTokenInitiativeActive = useCallback(
    (token: TacticalMapToken) => {
      if (!initiativeActive || !initiative) return false;
      if (token.characterId) {
        return isCharacterTurn(initiative, token.characterId, shouldSkipInitiative);
      }
      if (token.kind === 'monster' && token.monsterId && !token.isDead && gameId) {
        return isMonsterTokenTurn(initiative, token.monsterId, gameId, shouldSkipInitiative);
      }
      return false;
    },
    [initiativeActive, initiative, shouldSkipInitiative, gameId],
  );

  const canLootToken = useCallback(
    (token: TacticalMapToken) => {
      if (initiativeActive) return false;
      if (!token.isDead) return false;
      return token.kind === 'pc' || token.kind === 'monster';
    },
    [initiativeActive],
  );

  const openCorpseLoot = useCallback(
    (token: TacticalMapToken) => {
      if (token.characterId) {
        const character = characters.find((c) => c.id === token.characterId);
        if (!character) return;
        setCorpseLootRef({ kind: 'character', id: character.id });
        setCorpseLootOpen(true);
        return;
      }
      if (token.monsterId) {
        setCorpseLootRef({ kind: 'monster', id: token.monsterId });
        setCorpseLootOpen(true);
      }
    },
    [characters, setCorpseLootRef, setCorpseLootOpen],
  );

  const handleMapTokenClick = useCallback(
    (token: TacticalMapToken) => {
      if (!token.isDead) return;
      if (initiativeActive) {
        onError('Looting is only available after combat ends');
        return;
      }
      openCorpseLoot(token);
    },
    [initiativeActive, openCorpseLoot, onError],
  );

  const getTokenOverlay = useCallback(
    (token: TacticalMapToken): TokenMapOverlay | undefined => {
      if (token.kind !== 'pc' || !token.characterId || token.isDead) return undefined;
      const character = characters.find((c) => c.id === token.characterId);
      if (!character || character.status === 'dead') return undefined;

      const overlay: TokenMapOverlay = {};
      const feetPerCell = gridFt > 0 ? gridFt : 5;

      const lightFt = getCharacterLightRadiusFeet(character);
      if (lightFt != null && lightFt > 0) {
        overlay.lightRadiusCells = lightFt / feetPerCell;
      }

      if (initiativeActive && initiative) {
        const current = getCurrentTurnEntry(initiative, shouldSkipInitiative);
        if (
          current?.kind === 'character' &&
          current.characterId === character.id &&
          (isDm || character.ownerUserId === userId)
        ) {
          const stats: SharedCharacterStats = {
            ...(character.stats as SharedCharacterStats | undefined),
            abilities: (character.stats?.abilities ?? {}) as SharedCharacterStats['abilities'],
            speed: character.stats?.speed ?? 30,
          };
          const range = movementRangeFromStats(stats, feetPerCell);
          if (range.cells > 0) overlay.movementRadiusCells = range.cells;
        }
      }

      if (!overlay.lightRadiusCells && !overlay.movementRadiusCells) return undefined;
      return overlay;
    },
    [characters, gridFt, initiativeActive, initiative, shouldSkipInitiative, isDm, userId],
  );

  const setActiveMap = async (mapId: string) => {
    if (!gameId) return;
    setMapBusy(true);
    try {
      await api(`/games/${gameId}/maps/active`, {
        method: 'PATCH',
        body: JSON.stringify({ mapId }),
      });
      setActiveMapId(mapId);
      syncNpcTokensFromMap(maps.find((x) => x.id === mapId) ?? null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const cycleMap = (dir: -1 | 1) => {
    if (maps.length < 2) return;
    const idx = maps.findIndex((m) => m.id === activeMapId);
    void setActiveMap(maps[(idx + dir + maps.length) % maps.length]!.id);
  };

  const addMap = async () => {
    if (!gameId) return;
    setMapBusy(true);
    try {
      const { map } = await api<{ map: TacticalGameMap }>(`/games/${gameId}/maps`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setMaps((prev) => [...prev, map]);
      await setActiveMap(map.id);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const deleteActiveMap = async () => {
    if (!gameId || !activeMapId) return;
    setMapBusy(true);
    try {
      const data = await api<{ activeMapId: string | null }>(
        `/games/${gameId}/maps/${activeMapId}`,
        { method: 'DELETE' },
      );
      await loadMaps();
      if (data.activeMapId) setActiveMapId(data.activeMapId);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const patchActiveMap = async (body: Record<string, unknown>) => {
    if (!gameId || !activeMapId) return;
    setMapBusy(true);
    try {
      const { map } = await api<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
      if (map.id === activeMapId) syncNpcTokensFromMap(map);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const uploadMapImage = (file: File, gridW?: number, gridH?: number) => {
    if (!gameId || !activeMapId) return;
    const img = new window.Image();
    img.onload = () => {
      const fit =
        gridW && gridH
          ? fitImageToGrid(img.naturalWidth, img.naturalHeight, gridW, gridH)
          : { widthPx: img.naturalWidth, heightPx: img.naturalHeight };
      const form = new FormData();
      form.append('image', file);
      form.append('widthPx', String(fit.widthPx));
      form.append('heightPx', String(fit.heightPx));
      form.append('imageScale', '1');
      setMapBusy(true);
      void apiFormData<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}/image`,
        form,
        { method: 'PUT' },
      )
        .then(({ map }) => {
          setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
          if (map.id === activeMapId) syncNpcTokensFromMap(map);
        })
        .catch((e) => onError(formatError(e)))
        .finally(() => setMapBusy(false));
    };
    img.src = URL.createObjectURL(file);
  };

  const autoSyncMapTokens = useCallback(async () => {
    if (!gameId || !activeMapId || !isDm) return;
    try {
      const { map } = await api<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}/sync-tokens`,
        { method: 'POST' },
      );
      applyMapFromServer(map);
    } catch {
      /* best-effort */
    }
  }, [gameId, activeMapId, isDm, applyMapFromServer]);

  useEffect(() => {
    if (!gameId || !detailLoaded || !isDm || !activeMapId) return;
    void autoSyncMapTokens();
  }, [gameId, detailLoaded, isDm, activeMapId, autoSyncMapTokens]);

  const layoutMapTokens = async (anchor?: MapLayoutAnchor, kinds?: ('pc' | 'monster')[]) => {
    if (!gameId || !activeMapId) return;
    setMapBusy(true);
    try {
      const { map } = await api<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}/layout-tokens`,
        { method: 'POST', body: JSON.stringify({ ...(anchor ?? {}), kinds }) },
      );
      setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
      syncNpcTokensFromMap(map);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const resetPlayerMapTokens = (anchor?: MapLayoutAnchor) => void layoutMapTokens(anchor, ['pc']);
  const resetMonsterMapTokens = (anchor?: MapLayoutAnchor) =>
    void layoutMapTokens(anchor, ['monster']);

  const moveMapToken = async (tokenId: string, x: number, y: number) => {
    setMaps((prev) =>
      prev.map((m) =>
        m.id !== activeMapId
          ? m
          : {
              ...m,
              tokens: m.tokens.map((t) =>
                t.id === tokenId ? { ...t, x, y, zone: 'map' as const } : t,
              ),
            },
      ),
    );
    try {
      const res = await api<{ token: unknown }>(`/tokens/${tokenId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ x, y, zone: 'map' }),
      });
      const patch = parseMapTokenPatch(res.token);
      if (patch) applyMapTokenFromServer(patch);
    } catch (e) {
      onError(formatError(e));
      await loadMaps();
    }
  };

  return {
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    drawStrokeWidth,
    setDrawStrokeWidth,
    corpseLootTarget,
    isTokenInitiativeActive,
    canLootToken,
    handleMapTokenClick,
    getTokenOverlay,
    cycleMap,
    addMap,
    deleteActiveMap,
    patchActiveMap,
    uploadMapImage,
    resetPlayerMapTokens,
    resetMonsterMapTokens,
    moveMapToken,
    setActiveMap,
  };
}
