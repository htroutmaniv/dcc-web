import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GamePatch } from '@dcc-web/shared';
import { buildCombatTargetOptions } from '../utils/combat-target-options';
import type { GameMenuTab } from '../components/GameSideMenu';
import type { TransferInventoryResult } from '../components/inventory/TransferItemDialog';
import { useAuth } from '../context/AuthContext';
import type { TacticalMapToken } from '../types/map';
import {
  useCharacterActions,
  useCharacters,
  useCombatActions,
  useDiceRollActions,
  useDiceTray,
  useGameDetail,
  useGameMaps,
  useGameRealtimeSync,
  useMapActions,
  useMonsterActions,
  useMonsters,
  usePresence,
  useRollLog,
  applyGamePatch as applyGamePatchReducer,
} from './game';
import { useGameDeleteNotifications } from './useGameDeleteNotifications';
import { formatError } from '../utils/errors';
import { findStaleAttackTargetCharacterIds } from '../utils/character-attack-target';

export function useGamePageController(gameId: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [menuTab, setMenuTab] = useState<GameMenuTab>('characters');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [corpseLootRef, setCorpseLootRef] = useState<{
    kind: 'character' | 'monster';
    id: string;
  } | null>(null);
  const [corpseLootOpen, setCorpseLootOpen] = useState(false);

  const {
    detail,
    loading,
    setLoading,
    initiative,
    isDm,
    gameSettings,
    loadDetail,
    applyInitiative,
    applyGameSettingsPatch,
    isAccessError,
  } = useGameDetail(gameId);

  const {
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
    applyMapTokenFromServer,
    removeMapTokens,
  } = useGameMaps(gameId);

  const {
    characters,
    setCharacters,
    selectedCharacter,
    setSelectedCharacter,
    characterAttackTargetById,
    setCharacterAttackTargetById,
    loadCharacters,
    applyCharacterFromServer,
  } = useCharacters(gameId, isDm, user?.id);

  const {
    monsters,
    setMonsters,
    selectedMonster,
    setSelectedMonster,
    monsterTargetById,
    setMonsterTargetById,
    loadMonsters,
    handleMonsterUpdated,
  } = useMonsters(gameId, isDm);

  const { rollLog, setRollLog, lastRoll, loadDiceRolls, appendRollLog } = useRollLog(gameId);
  const { postDiceRoll } = useDiceRollActions(gameId, appendRollLog, applyInitiative);

  const {
    diceTrayCounts,
    setDiceTrayCounts,
    diceRolling,
    setDiceRolling,
    diceCharacterId,
    setDiceCharacterId,
    diceQuickRollKind,
    setDiceQuickRollKind,
    resetDiceTray,
  } = useDiceTray(characters, selectedCharacter?.id);

  const { presenceUsers, setPresenceUsers } = usePresence(gameId);

  const detailRef = useRef(detail);
  detailRef.current = detail;

  const monstersVisibleOnMap = gameSettings?.monstersVisibleOnMap === true;
  const sharedMonsterInitiative = gameSettings?.sharedMonsterInitiative === true;
  const hideMonsterAcInRollLog = gameSettings?.hideMonsterAcInRollLog === true;
  const initiativeActive = initiative?.active ?? false;

  const activeMapTokens = useMemo(() => activeMap?.tokens ?? [], [activeMap]);

  const combatTargetOptions = useMemo(
    () => buildCombatTargetOptions(monsters, npcTokens),
    [monsters, npcTokens],
  );

  const onError = useCallback((message: string | null) => setError(message), []);

  const applyGamePatch = useCallback(
    (patch: GamePatch) => {
      applyGamePatchReducer(patch, {
        applyCharacterFromServer,
        setCharacters,
        setSelectedCharacter,
        handleMonsterUpdated,
        setMonsters,
        setSelectedMonster,
        setMaps,
        setActiveMapId,
        applyMapFromServer,
        applyMapTokenFromServer,
        removeMapTokens,
        applyInitiative,
        applyGameSettingsPatch,
      });
    },
    [
      applyCharacterFromServer,
      setCharacters,
      setSelectedCharacter,
      handleMonsterUpdated,
      setMonsters,
      setSelectedMonster,
      setMaps,
      setActiveMapId,
      applyMapFromServer,
      applyMapTokenFromServer,
      removeMapTokens,
      applyInitiative,
      applyGameSettingsPatch,
    ],
  );

  const resyncAll = useCallback(() => {
    void loadDetail().catch(() => {});
    void loadDiceRolls().catch(() => {});
    void loadCharacters().catch(() => {});
    void loadMonsters().catch(() => {});
    void loadMaps().catch(() => {});
  }, [loadDetail, loadDiceRolls, loadCharacters, loadMonsters, loadMaps]);

  const characterActions = useCharacterActions({
    gameId,
    isDm,
    userId: user?.id,
    characters,
    characterAttackTargetById,
    setCharacterAttackTargetById,
    applyCharacterFromServer,
    applyGamePatch,
    selectedCharacter,
    setSelectedCharacter,
    activeMapId,
    activeMapTokens,
    setMenuTab,
    setCreateDialogOpen,
    onError,
  });

  const combatActions = useCombatActions({
    gameId,
    isDm,
    characters,
    initiative,
    characterAttackTargetById,
    diceTrayCounts,
    diceCharacterId,
    postDiceRoll,
    applyGamePatch,
    applyInitiative,
    applyGameSettingsPatch,
    setMenuTab,
    setDiceRolling,
    setDiceQuickRollKind,
    onError,
    monstersVisibleOnMap,
    sharedMonsterInitiative,
    hideMonsterAcInRollLog,
  });

  const monsterActions = useMonsterActions({
    gameId,
    monsters,
    setMonsters,
    selectedMonster,
    setSelectedMonster,
    setSelectedCharacter,
    monsterTargetById,
    setMonsterTargetById,
    handleMonsterUpdated,
    applyInitiative,
    applyGamePatch,
    loadCharacters,
    postDiceRoll,
    onError,
  });

  const mapActions = useMapActions({
    gameId,
    isDm,
    userId: user?.id,
    detailLoaded: Boolean(detail),
    characters,
    monsters,
    initiative,
    initiativeActive,
    maps,
    setMaps,
    activeMapId,
    setActiveMapId,
    activeMap,
    mapBusy,
    setMapBusy,
    loadMaps,
    syncNpcTokensFromMap,
    applyMapFromServer,
    applyMapTokenFromServer,
    onError,
    setCorpseLootRef,
    setCorpseLootOpen,
    corpseLootRef,
  });

  const lastGameFetchRef = useRef(0);
  const detailLoaded = detail !== null;

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    void (async () => {
      try {
        const data = await loadDetail();
        lastGameFetchRef.current = Date.now();
        if (data?.game.settings?.activeMapId) {
          setActiveMapId(data.game.settings.activeMapId);
        }
        await Promise.all([loadMaps(), loadDiceRolls()]);
      } catch (e) {
        setError(formatError(e));
        if (isAccessError(e)) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, loadDetail, loadMaps, loadDiceRolls, navigate, setLoading, isAccessError]);

  useEffect(() => {
    if (!gameId || !detailLoaded) return;
    void loadCharacters().catch((e) => setError(formatError(e)));
    if (isDm) void loadMonsters().catch(() => {});
  }, [gameId, detailLoaded, isDm, loadCharacters, loadMonsters]);

  useEffect(() => {
    if (initiativeActive && corpseLootOpen) {
      setCorpseLootOpen(false);
      setCorpseLootRef(null);
    }
  }, [initiativeActive, corpseLootOpen]);

  const clearingAttackTargetsRef = useRef(new Set<string>());

  useEffect(() => {
    const stale = findStaleAttackTargetCharacterIds(
      characters,
      monsters,
      npcTokens,
      characterAttackTargetById,
    );
    for (const characterId of stale) {
      if (clearingAttackTargetsRef.current.has(characterId)) continue;
      clearingAttackTargetsRef.current.add(characterId);
      void characterActions.setCharacterAttackTarget(characterId, null).finally(() => {
        clearingAttackTargetsRef.current.delete(characterId);
      });
    }
  }, [
    characters,
    monsters,
    npcTokens,
    characterAttackTargetById,
    characterActions.setCharacterAttackTarget,
  ]);

  useGameRealtimeSync(gameId, Boolean(gameId && detail), user?.id, detailRef, lastGameFetchRef, {
    loadDetail,
    loadDiceRolls,
    loadCharacters,
    loadMonsters,
    loadMaps,
    applyMapTokenFromServer,
    applyGamePatch,
    resyncAll,
    applyInitiative,
    applyGameSettingsPatch,
    appendRollLog,
    setCombatRollByCharacter: combatActions.setCombatRollByCharacter,
    setPresenceUsers,
    onCharacterUpsert: (character) => {
      applyCharacterFromServer(character);
    },
  });

  useGameDeleteNotifications({ gameId });

  const handleInventoryTransferred = useCallback(
    (result: TransferInventoryResult) => {
      if (result.sourceCharacter) applyCharacterFromServer(result.sourceCharacter);
      if (result.targetCharacter) applyCharacterFromServer(result.targetCharacter);
      if (result.sourceMonster) handleMonsterUpdated(result.sourceMonster);
      if (result.targetMonster) handleMonsterUpdated(result.targetMonster);
    },
    [applyCharacterFromServer, handleMonsterUpdated],
  );

  const canDragToken = useCallback(
    (t: TacticalMapToken) =>
      isDm ||
      Boolean(
        t.characterId &&
          characters.find((c) => c.id === t.characterId)?.ownerUserId === user?.id,
      ),
    [isDm, characters, user?.id],
  );

  const closeCorpseLoot = useCallback(() => {
    setCorpseLootOpen(false);
    setCorpseLootRef(null);
  }, []);

  const selectSidebarCharacter = useCallback(
    (c: (typeof characters)[number]) => {
      setSelectedCharacter(c);
      setMenuTab('characters');
    },
    [setSelectedCharacter],
  );

  return {
    gameId,
    user,
    error,
    setError,
    loading,
    detail,
    isDm,
    initiative,
    initiativeActive,
    monstersVisibleOnMap,
    sharedMonsterInitiative,
    hideMonsterAcInRollLog,
    characters,
    monsters,
    npcTokens,
    maps,
    activeMap,
    activeMapId,
    mapBusy,
    rollLog,
    setRollLog,
    lastRoll,
    selectedCharacter,
    setSelectedCharacter,
    selectedMonster,
    setSelectedMonster,
    monsterTargetById,
    setMonsters,
    applyInitiative,
    menuTab,
    setMenuTab,
    createDialogOpen,
    setCreateDialogOpen,
    corpseLootOpen,
    diceTrayCounts,
    setDiceTrayCounts,
    diceRolling,
    diceCharacterId,
    setDiceCharacterId,
    diceQuickRollKind,
    resetDiceTray,
    presenceUsers,
    combatTargetOptions,
    characterAttackTargetById,
    characterActions,
    combatActions,
    monsterActions,
    mapActions,
    handleInventoryTransferred,
    canDragToken,
    closeCorpseLoot,
    selectSidebarCharacter,
    applyCharacterFromServer,
    handleMonsterUpdated,
  };
}

export type GamePageController = ReturnType<typeof useGamePageController>;
