import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, ApiError } from '../api/client';
import { AppShell } from '../components/AppShell';
import {
  CreateCharacterDialog,
  type CreateCharacterPayload,
} from '../components/CreateCharacterDialog';
import { GameSideMenu, type GameMenuTab } from '../components/GameSideMenu';
import { CharacterSheetView } from '../components/character-sheet/CharacterSheetView';
import { MonsterSheetView } from '../components/monster-sheet/MonsterSheetView';
import { TacticalMap } from '../components/TacticalMap';
import { useAuth } from '../context/AuthContext';
import {
  ACTIVE_IN_PLAY_KEY,
  ACTIVE_LIGHT_ITEM_ID_KEY,
  buildDiceNotation,
  parseMonsterSheet,
  countConsumables,
  emptyDiceTray,
  getActiveLightItemId,
  isCharacterTurn,
  isUsingLightSource,
  listLightSourceOptions,
  resolveActiveLightItemId,
  parseGameInitiative,
  parseGameSettings,
  USING_LIGHT_SOURCE_KEY,
  type DiceTrayCounts,
  attackRollHits,
  getTargetAc,
  type DiceRollKind,
  type GameInitiativeState,
  fitImageToGrid,
  type MapDrawTool,
  type MapGridPreset,
  type MapLayoutAnchor,
  buildMonsterKilledStats,
} from '@dcc-web/shared';
import { ApplyDamageDialog, type MapTokenTarget } from '../components/ApplyDamageDialog';
import { ConsumeResourceDialog } from '../components/ConsumeResourceDialog';
import { DmControlPanel } from '../components/DmControlPanel';
import { InitiativeOrderPanel } from '../components/InitiativeOrderPanel';
import type {
  Character,
  DiceResult,
  GameDetail,
  GameMonsterInstance,
  GamePresenceUser,
} from '../types/game';
import {
  buildItemsAfterActivateLight,
  buildItemsAfterConsume,
  canExpendLightSource,
} from '../utils/consumables';
import {
  getCharacterRollSpec,
  type CharacterRollKind,
  type CombatRollKind,
} from '../utils/character-rolls';
import { characterRollKindToDiceKind, parseRollLogEntry } from '../utils/roll-log';
import {
  CHARACTER_ATTACK_TARGET_KEY,
  parseAttackTargetRef,
  readCharacterAttackTargetMap,
} from '../utils/character-attack-target';
import { MONSTER_ATTACK_TARGET_KEY, readMonsterTargetMap } from '../utils/monster-targets';
import { buildCombatTargetOptions } from '../components/CharacterListItem';
import type { TransferInventoryResult } from '../components/inventory/TransferItemDialog';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import type { TacticalGameMap } from '../types/map';
import { useGameSocket } from '../hooks/useGameSocket';
import { formatError } from '../utils/errors';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceResult | null>(null);
  const [menuTab, setMenuTab] = useState<GameMenuTab>('characters');
  const [presenceUsers, setPresenceUsers] = useState<GamePresenceUser[]>([]);
  const detailRef = useRef(detail);
  detailRef.current = detail;
  const [diceTrayCounts, setDiceTrayCounts] = useState<DiceTrayCounts>(emptyDiceTray);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceCharacterId, setDiceCharacterId] = useState<string | null>(null);
  const [diceQuickRollKind, setDiceQuickRollKind] = useState<CharacterRollKind | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [rollingCharacterId, setRollingCharacterId] = useState<string | null>(null);
  const [rollingKind, setRollingKind] = useState<CombatRollKind | null>(null);
  const [combatRollByCharacter, setCombatRollByCharacter] = useState<
    Record<string, DiceRollLogEntry>
  >({});
  const [characterAttackTargetById, setCharacterAttackTargetById] = useState<
    Record<string, string>
  >({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [consumableAdjustingId, setConsumableAdjustingId] = useState<string | null>(null);
  const [hpAdjustingId, setHpAdjustingId] = useState<string | null>(null);
  const [consumeDialog, setConsumeDialog] = useState<{
    character: Character;
    kind: 'food' | 'drink';
  } | null>(null);
  const [initiative, setInitiative] = useState<GameInitiativeState | null>(null);
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [endTurnCharacterId, setEndTurnCharacterId] = useState<string | null>(null);
  const [monsters, setMonsters] = useState<GameMonsterInstance[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<GameMonsterInstance | null>(null);
  const [monsterTargetById, setMonsterTargetById] = useState<Record<string, string>>({});
  const [lastMonsterAttackSummary, setLastMonsterAttackSummary] = useState<string | null>(null);
  const [monsterBusy, setMonsterBusy] = useState(false);
  const [rollLog, setRollLog] = useState<DiceRollLogEntry[]>([]);
  const [applyDamageRoll, setApplyDamageRoll] = useState<DiceRollLogEntry | null>(null);
  const [applyingDamage, setApplyingDamage] = useState(false);
  const [npcTokens, setNpcTokens] = useState<MapTokenTarget[]>([]);
  const [maps, setMaps] = useState<TacticalGameMap[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapBusy, setMapBusy] = useState(false);
  const [drawTool, setDrawTool] = useState<MapDrawTool>('select');
  const [drawColor, setDrawColor] = useState('#c9a227');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(2);

  /** DM = game creator only (server sets isDm from dm_user_id). */
  const isDm = detail?.isDm === true;

  const applyInitiative = useCallback((next: GameInitiativeState | null) => {
    setInitiative(next);
    setDetail((prev) => {
      if (!prev) return prev;
      const settings = parseGameSettings(prev.game.settings);
      return {
        ...prev,
        game: {
          ...prev.game,
          settings: { ...settings, initiative: next },
        },
      };
    });
  }, []);

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
  }, [gameId, syncNpcTokensFromMap]);

  const loadDetail = useCallback(async () => {
    if (!gameId) return;
    const data = await api<GameDetail>(`/games/${gameId}`);
    setDetail(data);
    setInitiative(parseGameInitiative(data.game.settings));
    const settings = parseGameSettings(data.game.settings);
    if (settings.activeMapId) setActiveMapId(settings.activeMapId);
    await loadMaps();
  }, [gameId, loadMaps]);

  const loadDiceRolls = useCallback(async () => {
    if (!gameId) return;
    const data = await api<{ rolls: DiceRollLogEntry[] }>(
      `/games/${gameId}/dice-rolls?limit=80`,
    );
    setRollLog(data.rolls);
  }, [gameId]);

  const appendRollLog = useCallback((entry: DiceRollLogEntry) => {
    setRollLog((prev) => {
      if (prev.some((r) => r.id === entry.id)) return prev;
      return [...prev, entry].slice(-100);
    });
    setLastRoll(entry);
  }, []);

  const postDiceRoll = useCallback(
    async (params: {
      notation: string;
      reason?: string;
      rollKind?: DiceRollKind;
      characterId?: string;
      targetType?: 'character' | 'monster' | 'npc';
      targetId?: string;
    }) => {
      if (!gameId) throw new Error('No game');
      const { result } = await api<{ result: DiceRollLogEntry }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          notation: params.notation,
          reason: params.reason,
          rollKind: params.rollKind,
          characterId: params.characterId,
          targetType: params.targetType,
          targetId: params.targetId,
        }),
      });
      const entry = parseRollLogEntry(result) ?? (result as DiceRollLogEntry);
      appendRollLog(entry);
      return entry;
    },
    [gameId, appendRollLog],
  );

  const loadMonsters = useCallback(async () => {
    if (!gameId || !detail) return;
    const data = await api<{ monsters: GameMonsterInstance[] }>(
      `/games/${gameId}/monsters`,
    );
    setMonsters(data.monsters);
    if (detail.isDm) {
      setMonsterTargetById((prev) => ({
        ...readMonsterTargetMap(data.monsters),
        ...prev,
      }));
    }
  }, [gameId, detail]);

  const loadCharacters = useCallback(async () => {
    if (!gameId || !detail) return;
    const q = detail.isDm ? '?includeDead=true' : '';
    const data = await api<{ characters: Character[] }>(
      `/games/${gameId}/characters${q}`,
    );
    setCharacters(data.characters);
    setCharacterAttackTargetById((prev) => ({
      ...readCharacterAttackTargetMap(data.characters),
      ...prev,
    }));
    setSelectedCharacter((prev) => {
      if (!prev) return null;
      return data.characters.find((c) => c.id === prev.id) ?? null;
    });
  }, [gameId, detail]);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    void Promise.all([loadDetail(), loadDiceRolls()])
      .catch((e) => {
        setError(formatError(e));
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          navigate('/');
        }
      })
      .finally(() => setLoading(false));
  }, [gameId, loadDetail, loadDiceRolls, navigate]);

  useEffect(() => {
    if (!detail) return;
    void loadCharacters().catch((e) => setError(formatError(e)));
    void loadMonsters().catch(() => {});
  }, [detail, loadCharacters, loadMonsters]);

  useEffect(() => {
    if (characters.length === 0) {
      setDiceCharacterId(null);
      return;
    }
    setDiceCharacterId((prev) =>
      prev && characters.some((c) => c.id === prev) ? prev : characters[0]!.id,
    );
  }, [characters]);

  useEffect(() => {
    if (selectedCharacter) {
      setDiceCharacterId(selectedCharacter.id);
    }
  }, [selectedCharacter?.id]);

  const createCharacter = async (payload: CreateCharacterPayload) => {
    if (!gameId) return;
    setCreatingCharacter(true);
    try {
      const { character } = await api<{ character: Character }>(
        `/games/${gameId}/characters`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      await loadCharacters();
      setSelectedCharacter(character);
      setMenuTab('characters');
      setCreateDialogOpen(false);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setCreatingCharacter(false);
    }
  };

  const setCharacterWeapon = async (character: Character, weaponId: string) => {
    const weapon = (character.items ?? []).find(
      (i) => i.category === 'weapon' && i.id === weaponId,
    );
    if (!weapon) return;
    const prevStats = character.stats ?? {};
    const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
    try {
      const res = await api<{ character: Character } | Character>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...prevStats,
              custom: {
                ...prevCustom,
                selectedWeaponId: weaponId,
                selectedWeaponName: weapon.name,
              },
            },
          }),
        },
      );
      const updated =
        res && typeof res === 'object' && 'character' in res
          ? res.character
          : (res as Character);
      if (updated?.id) applyCharacterFromServer(updated);
    } catch (e) {
      setError(formatError(e));
    }
  };

  const setCharacterAttackTarget = async (characterId: string, targetRef: string | null) => {
    setCharacterAttackTargetById((prev) => {
      const next = { ...prev };
      if (targetRef) next[characterId] = targetRef;
      else delete next[characterId];
      return next;
    });
    const c = characters.find((x) => x.id === characterId);
    if (!c) return;
    const prevCustom = (c.stats?.custom ?? {}) as Record<string, unknown>;
    try {
      const res = await api<{ character: Character } | Character>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...c.stats,
              custom: {
                ...prevCustom,
                [CHARACTER_ATTACK_TARGET_KEY]: targetRef ?? '',
              },
            },
          }),
        },
      );
      const updated =
        res && typeof res === 'object' && 'character' in res
          ? res.character
          : (res as Character);
      if (updated?.id) applyCharacterFromServer(updated);
    } catch {
      /* keep local selection */
    }
  };

  const combatTargetOptions = useMemo(
    () => buildCombatTargetOptions(monsters, npcTokens),
    [monsters, npcTokens],
  );

  const rollCharacterCombat = async (character: Character, kind: CombatRollKind) => {
    if (!gameId) return;
    const { notation, reason } = getCharacterRollSpec(character, kind);
    const targetRef =
      initiative?.active && (kind === 'toHit' || kind === 'damage')
        ? characterAttackTargetById[character.id]
        : undefined;
    const parsedTarget = parseAttackTargetRef(targetRef);

    setRollingCharacterId(character.id);
    setRollingKind(kind);
    try {
      const result = await postDiceRoll({
        notation,
        reason,
        rollKind: characterRollKindToDiceKind(kind),
        characterId: character.id,
        ...(parsedTarget && {
          targetType: parsedTarget.type,
          targetId: parsedTarget.id,
        }),
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setRollingCharacterId(null);
      setRollingKind(null);
    }
  };

  const rollDiceTray = async () => {
    if (!gameId) return;
    const notation = buildDiceNotation(diceTrayCounts);
    if (!notation) return;
    setDiceRolling(true);
    try {
      await postDiceRoll({
        notation,
        reason: 'Table roll',
        rollKind: 'unspecified',
      });
      setMenuTab('dice');
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setDiceRolling(false);
    }
  };

  const resetDiceTray = () => {
    setDiceTrayCounts(emptyDiceTray());
  };

  const rollCharacterQuickRoll = async (kind: CharacterRollKind) => {
    if (!gameId || !diceCharacterId) return;
    const character = characters.find((c) => c.id === diceCharacterId);
    if (!character) return;
    const { notation, reason } = getCharacterRollSpec(character, kind);
    setDiceRolling(true);
    setDiceQuickRollKind(kind);
    try {
      const result = await postDiceRoll({
        notation,
        reason,
        rollKind: characterRollKindToDiceKind(kind),
        characterId: character.id,
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      setMenuTab('dice');
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setDiceRolling(false);
      setDiceQuickRollKind(null);
    }
  };

  const applyCharacterFromServer = useCallback(
    (updated: Character) => {
      if (
        !isDm &&
        updated.ownerUserId &&
        user?.id &&
        updated.ownerUserId !== user.id
      ) {
        return;
      }
      setSelectedCharacter((prev) => (prev?.id === updated.id ? updated : prev));
      setCharacters((prev) => {
        if (updated.status === 'archived') {
          return prev.filter((c) => c.id !== updated.id);
        }
        const idx = prev.findIndex((c) => c.id === updated.id);
        if (idx >= 0) {
          return prev.map((c) => (c.id === updated.id ? updated : c));
        }
        return [...prev, updated];
      });
    },
    [isDm, user?.id],
  );

  const handleCharacterUpdated = applyCharacterFromServer;

  const patchCharacterHp = async (character: Character, hpCurrent: number) => {
    const hpMax =
      typeof character.combat?.hpMax === 'number'
        ? character.combat.hpMax
        : Math.max(0, hpCurrent);
    const nextHp = Math.max(0, Math.min(hpMax, hpCurrent));
    setHpAdjustingId(character.id);
    try {
      const res = await api<{ character: Character } | Character>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            combat: {
              ...(character.combat ?? {}),
              hpCurrent: nextHp,
              hpMax,
            },
          }),
        },
      );
      const updated =
        res && typeof res === 'object' && 'character' in res
          ? res.character
          : (res as Character);
      if (updated?.id) applyCharacterFromServer(updated);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setHpAdjustingId(null);
    }
  };

  useGameSocket(
    gameId,
    {
      onConnected: () => {
        // Full resync after (re)connect — catches anything missed while disconnected.
        void loadDetail().catch(() => {});
        void loadDiceRolls().catch(() => {});
      },
      onMonstersChanged: (actorUserId) => {
        if (actorUserId && actorUserId === user?.id) return;
        void loadMonsters().catch(() => {});
      },
      onCharacterUpsert: (_character, actorUserId) => {
        if (actorUserId && actorUserId === user?.id) return;
        void loadCharacters().catch(() => {});
      },
      onInitiativeUpdated: (next) => {
        applyInitiative(next);
      },
      onDiceRolled: ({ result, characterId }) => {
        const entry = parseRollLogEntry(result);
        if (entry) appendRollLog(entry);
        if (characterId && entry) {
          setCombatRollByCharacter((prev) => ({ ...prev, [characterId]: entry }));
        }
      },
      onDamageApplied: () => {
        void loadCharacters().catch(() => {});
        void loadMonsters().catch(() => {});
        void loadDetail().catch(() => {});
      },
      onTokenUpdated: () => {
        void loadMaps().catch(() => {});
      },
      onMapUpdated: () => {
        void loadMaps().catch(() => {});
      },
      onPresenceUpdated: (users) => {
        setPresenceUsers(users);
        const d = detailRef.current;
        if (!d) return;
        const rosterIds = new Set<string>([
          d.game.dmUserId,
          ...(d.game.players?.map((p) => p.user.id) ?? []),
        ]);
        if (users.some((u) => !rosterIds.has(u.userId))) {
          void loadDetail().catch(() => {});
        }
      },
      onRosterChanged: (actorUserId) => {
        if (actorUserId && actorUserId === user?.id) return;
        void loadDetail().catch(() => {});
      },
    },
    Boolean(gameId && detail),
  );

  useEffect(() => {
    setPresenceUsers([]);
  }, [gameId]);

  const handleMonsterUpdated = useCallback((m: GameMonsterInstance) => {
    setMonsters((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    setSelectedMonster((prev) => (prev?.id === m.id ? m : prev));
  }, []);

  const handleInventoryTransferred = useCallback(
    (result: TransferInventoryResult) => {
      if (result.sourceCharacter) handleCharacterUpdated(result.sourceCharacter);
      if (result.targetCharacter) handleCharacterUpdated(result.targetCharacter);
      if (result.sourceMonster) handleMonsterUpdated(result.sourceMonster);
      if (result.targetMonster) handleMonsterUpdated(result.targetMonster);
    },
    [handleCharacterUpdated, handleMonsterUpdated],
  );

  const patchMonsterHp = async (monster: GameMonsterInstance, hpCurrent: number) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const body: Record<string, unknown> = { hpCurrent };
      if (hpCurrent > 0 && monster.stats?.custom?.killed === true) {
        body.stats = buildMonsterKilledStats(monster.stats, false);
      }
      const data = await api<{
        monster: GameMonsterInstance;
        initiative: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      handleMonsterUpdated(data.monster);
      if (data.initiative) applyInitiative(data.initiative);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const killMonster = async (monster: GameMonsterInstance) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const data = await api<{
        monster: GameMonsterInstance;
        initiative: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hpCurrent: 0,
          stats: buildMonsterKilledStats(monster.stats, true),
        }),
      });
      handleMonsterUpdated(data.monster);
      if (data.initiative) applyInitiative(data.initiative);
      await loadMaps();
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const deleteMonsterQuick = async (monsterId: string) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const data = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/monsters/${monsterId}`,
        { method: 'DELETE' },
      );
      setMonsters((prev) => prev.filter((m) => m.id !== monsterId));
      if (selectedMonster?.id === monsterId) setSelectedMonster(null);
      applyInitiative(data.initiative);
      await loadMaps();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const setMonsterAttackTarget = async (monsterId: string, characterId: string | null) => {
    setMonsterTargetById((prev) => {
      const next = { ...prev };
      if (characterId) next[monsterId] = characterId;
      else delete next[monsterId];
      return next;
    });
    const m = monsters.find((x) => x.id === monsterId);
    if (!m || !gameId) return;
    const prevCustom = (m.stats?.custom ?? {}) as Record<string, unknown>;
    try {
      const { monster: updated } = await api<{ monster: GameMonsterInstance }>(
        `/games/${gameId}/monsters/${monsterId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...m.stats,
              custom: {
                ...prevCustom,
                [MONSTER_ATTACK_TARGET_KEY]: characterId ?? '',
              },
            },
          }),
        },
      );
      handleMonsterUpdated(updated);
    } catch {
      /* keep local target selection */
    }
  };

  const rollMonsterAttack = async (monster: GameMonsterInstance, target: Character) => {
    if (!gameId) return;
    const atk = parseMonsterSheet(monster.sheet).attacks[0];
    const mod = Number(atk?.attackBonus ?? monster.attackBonus) || 0;
    const ac = getTargetAc(target.combat);
    const damageNotation = atk?.damage ?? monster.damage;
    const atkLabel = atk?.name ?? 'attack';

    setMonsterBusy(true);
    try {
      const attackResult = await postDiceRoll({
        notation: `1d20${mod >= 0 ? `+${mod}` : mod}`,
        reason: `${monster.name} → ${target.name} ${atkLabel} (AC ${ac})`,
        rollKind: 'attack',
      });
      const natural = attackResult.rolls[0];
      const hit = attackRollHits(attackResult.total, ac, natural);

      if (!hit) {
        setLastMonsterAttackSummary(
          `${monster.name} missed ${target.name}: ${attackResult.total} vs AC ${ac}`,
        );
        setError(null);
        return;
      }

      const damageResult = await postDiceRoll({
        notation: damageNotation,
        reason: `${monster.name} → ${target.name} damage`,
        rollKind: 'damage',
      });
      const { hpAfter } = await api<{ hpAfter: number; targetName: string }>(
        `/games/${gameId}/apply-damage`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: damageResult.total,
            targetType: 'character',
            targetId: target.id,
            rollLogId: damageResult.id,
          }),
        },
      );
      await loadCharacters();
      setLastMonsterAttackSummary(
        `${monster.name} hit ${target.name} (${attackResult.total} vs AC ${ac}) for ${damageResult.total} → ${hpAfter} HP`,
      );
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const applyDamageFromRoll = async (
    targetType: 'character' | 'monster' | 'npc',
    targetId: string,
    amount: number,
  ) => {
    if (!gameId) return;
    setApplyingDamage(true);
    try {
      await api(`/games/${gameId}/apply-damage`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          targetType,
          targetId,
          rollLogId: applyDamageRoll?.id,
        }),
      });
      setApplyDamageRoll(null);
      await loadCharacters();
      if (isDm) await loadMonsters();
      await loadDetail();
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setApplyingDamage(false);
    }
  };

  const openMonsterSheet = (monsterId: string) => {
    const m = monsters.find((x) => x.id === monsterId);
    if (m) {
      setSelectedMonster(m);
      setSelectedCharacter(null);
    }
  };

  const canEditCharacter = useCallback(
    (c: Character) => isDm || (user != null && c.ownerUserId === user.id),
    [isDm, user],
  );

  const putCharacterItems = async (
    character: Character,
    items: {
      id?: string;
      category: string;
      name: string;
      quantity: number;
      notes?: string;
      properties?: Record<string, unknown>;
    }[],
  ) => {
    const { character: updated } = await api<{ character: Character }>(
      `/characters/${character.id}/items`,
      { method: 'PUT', body: JSON.stringify({ items }) },
    );
    return updated;
  };

  const patchLightCustom = async (
    character: Character,
    patch: { equippedId?: string | null; lit?: boolean },
  ): Promise<Character> => {
    const prevStats = character.stats ?? {};
    const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
    const res = await api<{ character: Character }>(`/characters/${character.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stats: {
          ...prevStats,
          custom: {
            ...prevCustom,
            ...(patch.equippedId !== undefined && {
              [ACTIVE_LIGHT_ITEM_ID_KEY]: patch.equippedId ?? '',
            }),
            ...(patch.lit !== undefined && {
              [USING_LIGHT_SOURCE_KEY]: patch.lit,
            }),
          },
        },
      }),
    });
    return res.character;
  };

  const reconcileEquippedLight = async (
    character: Character,
    previousActiveId: string | undefined,
    previousItems?: Character['items'],
  ): Promise<Character> => {
    if (!previousActiveId) return character;
    const resolved = resolveActiveLightItemId(
      character.items ?? [],
      previousActiveId,
      previousItems,
    );
    if (!resolved) {
      return patchLightCustom(character, { equippedId: null, lit: false });
    }
    let updated = character;
    if (resolved !== getActiveLightItemId(character)) {
      updated = await patchLightCustom(updated, { equippedId: resolved });
    }
    if (isUsingLightSource(updated)) {
      const canExpend = canExpendLightSource(updated.items ?? [], resolved);
      if (!canExpend.ok) {
        updated = await patchLightCustom(updated, { lit: false });
      }
    }
    return updated;
  };

  const clearLightIfInvalid = async (character: Character): Promise<Character> => {
    const activeId = getActiveLightItemId(character);
    if (!activeId) {
      if (!isUsingLightSource(character)) return character;
      return patchLightCustom(character, { lit: false });
    }
    return reconcileEquippedLight(character, activeId, character.items);
  };

  const openConsumeDialog = (character: Character, kind: 'food' | 'drink') => {
    if (!canEditCharacter(character)) return;
    setConsumeDialog({ character, kind });
  };

  const applyConsumeItem = async (itemId: string, units = 1) => {
    const target = consumeDialog?.character;
    if (!target) return;
    setConsumableAdjustingId(target.id);
    try {
      const built = buildItemsAfterConsume(target, itemId, units);
      if (!built.ok) {
        setError(built.message ?? 'Could not consume');
        return;
      }
      let updated = await putCharacterItems(target, built.items);
      updated = await clearLightIfInvalid(updated);
      handleCharacterUpdated(updated);
      setConsumeDialog(null);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const selectActiveLight = async (character: Character, lightItemId: string | null) => {
    if (!canEditCharacter(character)) return;
    setConsumableAdjustingId(character.id);
    try {
      let updated = await patchLightCustom(character, { equippedId: lightItemId });
      if (!lightItemId) {
        updated = await patchLightCustom(updated, { lit: false });
      }
      updated = await clearLightIfInvalid(updated);
      handleCharacterUpdated(updated);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const toggleLightLit = async (character: Character, lit: boolean) => {
    if (!canEditCharacter(character)) return;
    if (lit && !getActiveLightItemId(character)) {
      setError('Select a light source first');
      return;
    }
    setConsumableAdjustingId(character.id);
    try {
      const updated = await patchLightCustom(character, { lit });
      handleCharacterUpdated(updated);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const expendActiveLight = async (character: Character) => {
    if (!canEditCharacter(character)) return;
    const activeId = getActiveLightItemId(character);
    if (!activeId) {
      setError('Select an active light source first');
      return;
    }
    setConsumableAdjustingId(character.id);
    try {
      const built = buildItemsAfterActivateLight(character, activeId);
      if (!built.ok) {
        setError(built.message ?? 'Could not expend');
        return;
      }
      const itemsBefore = character.items;
      let updated = await putCharacterItems(character, built.items);
      updated = await reconcileEquippedLight(updated, activeId, itemsBefore);
      handleCharacterUpdated(updated);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const toggleInPlay = async (character: Character, active: boolean) => {
    if (!canEditCharacter(character)) return;
    setConsumableAdjustingId(character.id);
    try {
      const prevStats = character.stats ?? {};
      const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
      const { character: updated } = await api<{ character: Character }>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...prevStats,
              custom: { ...prevCustom, [ACTIVE_IN_PLAY_KEY]: active },
            },
          }),
        },
      );
      handleCharacterUpdated(updated);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const runInitiativeAction = async (
    path: string,
    method: 'POST' = 'POST',
    body?: unknown,
  ) => {
    if (!gameId) return;
    setInitiativeBusy(true);
    try {
      const res = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/initiative${path}`,
        { method, body: body ? JSON.stringify(body) : undefined },
      );
      applyInitiative(res.initiative ?? null);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setInitiativeBusy(false);
    }
  };

  const startInitiative = () => void runInitiativeAction('/start');
  const advanceInitiative = () => void runInitiativeAction('/advance');
  const endInitiative = () => void runInitiativeAction('/end');

  const endTurn = async (character: Character) => {
    if (!gameId) return;
    setEndTurnCharacterId(character.id);
    try {
      const res = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/initiative/end-turn`,
        {
          method: 'POST',
          body: JSON.stringify({ characterId: character.id }),
        },
      );
      applyInitiative(res.initiative ?? null);
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setEndTurnCharacterId(null);
    }
  };


  const patchCharacterStatus = async (
    characterId: string,
    status: 'alive' | 'dead' | 'archived',
  ) => {
    try {
      await api(`/characters/${characterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (status === 'archived' && selectedCharacter?.id === characterId) {
        setSelectedCharacter(null);
      }
      await loadCharacters();
      if (status === 'archived' || status === 'dead') {
        await loadMaps();
      }
      setError(null);
    } catch (e) {
      setError(formatError(e));
    }
  };

  const markDead = (characterId: string) => patchCharacterStatus(characterId, 'dead');
  const reviveCharacter = (characterId: string) =>
    patchCharacterStatus(characterId, 'alive');
  const archiveCharacter = (characterId: string) =>
    patchCharacterStatus(characterId, 'archived');

  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? maps[0] ?? null,
    [maps, activeMapId],
  );

  const gridFt = activeMap?.gridFtPerCell ?? 5;

  const setActiveMap = async (mapId: string) => {
    if (!gameId) return;
    setMapBusy(true);
    try {
      await api(`/games/${gameId}/maps/active`, {
        method: 'PATCH',
        body: JSON.stringify({ mapId }),
      });
      setActiveMapId(mapId);
      const m = maps.find((x) => x.id === mapId) ?? null;
      syncNpcTokensFromMap(m);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const cycleMap = (dir: -1 | 1) => {
    if (maps.length < 2) return;
    const idx = maps.findIndex((m) => m.id === activeMapId);
    const next = (idx + dir + maps.length) % maps.length;
    void setActiveMap(maps[next]!.id);
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
      setError(formatError(e));
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
      setError(formatError(e));
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
      setError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

  const uploadMapImage = (file: File, gridW?: number, gridH?: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const fit =
          gridW && gridH
            ? fitImageToGrid(img.naturalWidth, img.naturalHeight, gridW, gridH)
            : { widthPx: img.naturalWidth, heightPx: img.naturalHeight };
        void patchActiveMap({
          imageDataUrl: dataUrl,
          widthPx: fit.widthPx,
          heightPx: fit.heightPx,
          imageScale: 1,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const applyMapFromServer = useCallback(
    (map: TacticalGameMap) => {
      setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
      if (map.id === activeMapId) syncNpcTokensFromMap(map);
    },
    [activeMapId, syncNpcTokensFromMap],
  );

  const autoSyncMapTokens = useCallback(async () => {
    if (!gameId || !activeMapId || !isDm) return;
    try {
      const { map } = await api<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}/sync-tokens`,
        { method: 'POST' },
      );
      applyMapFromServer(map);
    } catch {
      /* auto-sync is best-effort */
    }
  }, [gameId, activeMapId, isDm, applyMapFromServer]);

  useEffect(() => {
    if (!gameId || !detail || !isDm || !activeMapId) return;
    void autoSyncMapTokens();
  }, [gameId, detail, isDm, activeMapId, autoSyncMapTokens]);

  const layoutMapTokens = async (anchor?: MapLayoutAnchor) => {
    if (!gameId || !activeMapId) return;
    setMapBusy(true);
    try {
      const { map } = await api<{ map: TacticalGameMap }>(
        `/games/${gameId}/maps/${activeMapId}/layout-tokens`,
        {
          method: 'POST',
          body: JSON.stringify(anchor ?? {}),
        },
      );
      setMaps((prev) => prev.map((m) => (m.id === map.id ? map : m)));
      syncNpcTokensFromMap(map);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setMapBusy(false);
    }
  };

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
      await api(`/tokens/${tokenId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ x, y, zone: 'map' }),
      });
    } catch (e) {
      setError(formatError(e));
      await loadMaps();
    }
  };

  const headerActions = (
    <>
      <Button
        component={RouterLink}
        to="/"
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mr: 1 }}
      >
        All games
      </Button>
      {detail && (
        <Chip
          size="small"
          label={isDm ? 'DM' : 'Player'}
          color={isDm ? 'primary' : 'default'}
          variant="outlined"
          sx={{ mr: 1 }}
        />
      )}
    </>
  );

  if (loading) {
    return (
      <AppShell title="Loading…" actions={headerActions} showBrandLink>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AppShell>
    );
  }

  if (!detail || !gameId) {
    return (
      <AppShell actions={headerActions} showBrandLink>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error ?? 'Game not found'}</Alert>
          <Link component={RouterLink} to="/" sx={{ mt: 2, display: 'inline-block' }}>
            Back to home
          </Link>
        </Box>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={detail.game.title}
      actions={headerActions}
      showBrandLink
    >
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mx: 2, mt: 1 }}
        >
          {error}
        </Alert>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedCharacter ? (
            <CharacterSheetView
              character={selectedCharacter}
              gameId={gameId}
              partyCharacters={characters}
              partyMonsters={monsters}
              isDm={isDm}
              players={detail.game.players?.map((p) => p.user) ?? []}
              dmUserId={detail.game.dmUserId}
              onClose={() => setSelectedCharacter(null)}
              onCharacterUpdated={handleCharacterUpdated}
              onMonsterUpdated={handleMonsterUpdated}
              onInventoryTransferred={handleInventoryTransferred}
              onMarkDead={markDead}
              onRevive={reviveCharacter}
              onArchive={archiveCharacter}
            />
          ) : selectedMonster && isDm ? (
            <MonsterSheetView
              gameId={gameId}
              monster={selectedMonster}
              partyCharacters={characters}
              partyMonsters={monsters}
              onClose={() => setSelectedMonster(null)}
              onMonsterUpdated={handleMonsterUpdated}
              onInventoryTransferred={handleInventoryTransferred}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'row',
                p: 2,
                gap: 0,
                overflow: 'hidden',
              }}
            >
              {isDm && (
                <DmControlPanel
                  initiative={initiative}
                  onStartInitiative={startInitiative}
                  onAdvanceTurn={advanceInitiative}
                  onEndInitiative={endInitiative}
                  busy={initiativeBusy || monsterBusy}
                  monsters={monsters}
                  characters={characters}
                  monsterTargetById={monsterTargetById}
                  sheetMonsterId={selectedMonster?.id ?? null}
                  onMonsterTargetChange={setMonsterAttackTarget}
                  onPatchMonsterHp={patchMonsterHp}
                  onKillMonster={killMonster}
                  onDeleteMonster={deleteMonsterQuick}
                  onRollMonsterAttack={rollMonsterAttack}
                  onOpenMonsterSheet={openMonsterSheet}
                  lastAttackSummary={lastMonsterAttackSummary}
                />
              )}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <TacticalMap
                  gameId={gameId}
                  isDm={isDm}
                  maps={maps}
                  activeMap={activeMap}
                  activeMapId={activeMapId}
                  initiativeActive={initiative?.active ?? false}
                  mapBusy={mapBusy}
                  drawTool={drawTool}
                  drawColor={drawColor}
                  drawStrokeWidth={drawStrokeWidth}
                  onDrawToolChange={setDrawTool}
                  onDrawColorChange={setDrawColor}
                  onDrawStrokeWidthChange={setDrawStrokeWidth}
                  onImageScaleChange={(imageScale) => void patchActiveMap({ imageScale })}
                  onSelectMap={(id) => void setActiveMap(id)}
                  onPrevMap={() => cycleMap(-1)}
                  onNextMap={() => cycleMap(1)}
                  onAddMap={() => void addMap()}
                  onDeleteMap={() => void deleteActiveMap()}
                  onToggleMapVisible={() =>
                    activeMap && void patchActiveMap({ visible: !activeMap.visible })
                  }
                  onGridPresetChange={(preset) => void patchActiveMap({ gridPreset: preset })}
                  onUploadImage={uploadMapImage}
                  onRemoveImage={() => void patchActiveMap({ clearImage: true })}
                  onRenameMap={(name) => void patchActiveMap({ name })}
                  onLayoutTokens={(anchor) => void layoutMapTokens(anchor)}
                  onClearDrawings={() => void patchActiveMap({ dmDrawings: [] })}
                  onDrawingsChange={(drawings) => void patchActiveMap({ dmDrawings: drawings })}
                  onTokenMove={(tokenId, x, y) => void moveMapToken(tokenId, x, y)}
                  canDragToken={(t) =>
                    isDm ||
                    Boolean(
                      t.characterId &&
                        characters.find((c) => c.id === t.characterId)?.ownerUserId ===
                          user?.id,
                    )
                  }
                  rollLog={rollLog}
                  onClearRollLog={() => setRollLog([])}
                  onApplyDamageFromRoll={
                    isDm ? (roll) => setApplyDamageRoll(roll) : undefined
                  }
                />
                <InitiativeOrderPanel initiative={initiative} />
              </Box>
            </Box>
          )}
        </Box>
        <GameSideMenu
          game={detail.game}
          isDm={isDm}
          inviteCode={detail.game.inviteCode}
          characters={characters}
          players={detail.game.players}
          tab={menuTab}
          onTabChange={setMenuTab}
          lastRoll={lastRoll}
          onAddCharacter={() => setCreateDialogOpen(true)}
          diceTrayCounts={diceTrayCounts}
          onDiceTrayCountsChange={setDiceTrayCounts}
          onResetDiceTray={resetDiceTray}
          diceRolling={diceRolling}
          onRollDiceTray={rollDiceTray}
          diceCharacterId={diceCharacterId}
          onDiceCharacterIdChange={setDiceCharacterId}
          onCharacterQuickRoll={rollCharacterQuickRoll}
          diceQuickRollKind={diceQuickRollKind}
          onSelectCharacter={(c) => {
            setSelectedCharacter(c);
            setMenuTab('characters');
          }}
          onCombatRoll={rollCharacterCombat}
          onPatchCharacterHp={patchCharacterHp}
          hpAdjustingId={hpAdjustingId}
          onSelectWeapon={setCharacterWeapon}
          combatTargetOptions={combatTargetOptions}
          characterAttackTargetById={characterAttackTargetById}
          onCharacterAttackTargetChange={setCharacterAttackTarget}
          onOpenConsume={openConsumeDialog}
          onSelectActiveLight={selectActiveLight}
          onToggleLightLit={toggleLightLit}
          onExpendActiveLight={expendActiveLight}
          consumableAdjustingId={consumableAdjustingId}
          canEditCharacter={canEditCharacter}
          rollingCharacterId={rollingCharacterId}
          rollingKind={rollingKind}
          combatRollByCharacter={combatRollByCharacter}
          selectedCharacterId={selectedCharacter?.id}
          initiative={initiative}
          onToggleInPlay={toggleInPlay}
          onEndTurn={endTurn}
          endTurnCharacterId={endTurnCharacterId}
          currentUserId={user?.id}
          monsters={monsters}
          onMonstersChange={setMonsters}
          onMonsterInitiativeChange={applyInitiative}
          onMonsterPanelError={setError}
          presenceUsers={presenceUsers}
        />
      </Box>
      <CreateCharacterDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={createCharacter}
        submitting={creatingCharacter}
        isDm={isDm}
        players={detail?.game.players?.map((p) => p.user) ?? []}
        dmUserId={detail?.game.dmUserId}
      />
      <ApplyDamageDialog
        open={applyDamageRoll != null}
        roll={applyDamageRoll}
        characters={characters}
        monsters={monsters}
        npcTokens={npcTokens}
        onClose={() => setApplyDamageRoll(null)}
        onApply={applyDamageFromRoll}
        applying={applyingDamage}
      />
      <ConsumeResourceDialog
        open={consumeDialog != null}
        character={consumeDialog?.character ?? null}
        kind={consumeDialog?.kind ?? null}
        busy={consumableAdjustingId != null}
        onClose={() => setConsumeDialog(null)}
        onConsume={(itemId) => void applyConsumeItem(itemId)}
      />
    </AppShell>
  );
}
