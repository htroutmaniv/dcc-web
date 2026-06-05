import { useCallback, useEffect, useState } from 'react';
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
import { TacticalMap } from '../components/TacticalMap';
import { useAuth } from '../context/AuthContext';
import {
  ACTIVE_IN_PLAY_KEY,
  ACTIVE_LIGHT_ITEM_ID_KEY,
  buildDiceNotation,
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
  type GameInitiativeState,
} from '@dcc-web/shared';
import { ConsumeResourceDialog } from '../components/ConsumeResourceDialog';
import { DmControlPanel } from '../components/DmControlPanel';
import { InitiativeOrderPanel } from '../components/InitiativeOrderPanel';
import type { Character, DiceResult, GameDetail } from '../types/game';
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
  const [diceTrayCounts, setDiceTrayCounts] = useState<DiceTrayCounts>(emptyDiceTray);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceCharacterId, setDiceCharacterId] = useState<string | null>(null);
  const [diceQuickRollKind, setDiceQuickRollKind] = useState<CharacterRollKind | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [rollingCharacterId, setRollingCharacterId] = useState<string | null>(null);
  const [rollingKind, setRollingKind] = useState<CombatRollKind | null>(null);
  const [combatRollByCharacter, setCombatRollByCharacter] = useState<
    Record<string, DiceResult>
  >({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [consumableAdjustingId, setConsumableAdjustingId] = useState<string | null>(null);
  const [consumeDialog, setConsumeDialog] = useState<{
    character: Character;
    kind: 'food' | 'drink';
  } | null>(null);
  const [initiative, setInitiative] = useState<GameInitiativeState | null>(null);
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [endTurnCharacterId, setEndTurnCharacterId] = useState<string | null>(null);

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

  const loadDetail = useCallback(async () => {
    if (!gameId) return;
    const data = await api<GameDetail>(`/games/${gameId}`);
    setDetail(data);
    setInitiative(parseGameInitiative(data.game.settings));
  }, [gameId]);

  const loadCharacters = useCallback(async () => {
    if (!gameId || !detail) return;
    const q = detail.isDm ? '?includeDead=true' : '';
    const data = await api<{ characters: Character[] }>(
      `/games/${gameId}/characters${q}`,
    );
    setCharacters(data.characters);
    setSelectedCharacter((prev) => {
      if (!prev) return null;
      return data.characters.find((c) => c.id === prev.id) ?? null;
    });
  }, [gameId, detail]);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    void loadDetail()
      .catch((e) => {
        setError(formatError(e));
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          navigate('/');
        }
      })
      .finally(() => setLoading(false));
  }, [gameId, loadDetail, navigate]);

  useEffect(() => {
    if (!detail) return;
    void loadCharacters().catch((e) => setError(formatError(e)));
  }, [detail, loadCharacters]);

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

  const rollCharacterCombat = async (character: Character, kind: CombatRollKind) => {
    if (!gameId) return;
    const { notation, reason } = getCharacterRollSpec(character, kind);
    setRollingCharacterId(character.id);
    setRollingKind(kind);
    try {
      const { result } = await api<{ result: DiceResult }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          characterId: character.id,
          notation,
          reason,
        }),
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      setLastRoll(result);
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
      const { result } = await api<{ result: DiceResult }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          notation,
          reason: 'Table roll',
        }),
      });
      setLastRoll(result);
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
      const { result } = await api<{ result: DiceResult }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          characterId: character.id,
          notation,
          reason,
        }),
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      setLastRoll(result);
      setMenuTab('dice');
      setError(null);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setDiceRolling(false);
      setDiceQuickRollKind(null);
    }
  };

  const applyCharacterFromServer = useCallback((updated: Character) => {
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
  }, []);

  const handleCharacterUpdated = applyCharacterFromServer;

  useGameSocket(
    gameId,
    {
      onConnected: () => {
        void loadCharacters().catch(() => {});
      },
      onCharacterUpsert: (character, actorUserId) => {
        if (actorUserId && actorUserId === user?.id) return;
        applyCharacterFromServer(character);
      },
      onInitiativeUpdated: (next) => {
        applyInitiative(next);
      },
      onDiceRolled: ({ result, characterId, actorUserId }) => {
        if (actorUserId && actorUserId === user?.id) return;
        setLastRoll(result);
        if (characterId) {
          setCombatRollByCharacter((prev) => ({ ...prev, [characterId]: result }));
        }
      },
    },
    Boolean(gameId && detail),
  );

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

  const gridFt =
    detail?.game.map?.gridFtPerCell != null
      ? Number(detail.game.map.gridFtPerCell)
      : 5;

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
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedCharacter ? (
            <CharacterSheetView
              character={selectedCharacter}
              isDm={isDm}
              onClose={() => setSelectedCharacter(null)}
              onCharacterUpdated={handleCharacterUpdated}
              onMarkDead={markDead}
              onRevive={reviveCharacter}
              onArchive={archiveCharacter}
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
              }}
            >
              {isDm && (
                <DmControlPanel
                  initiative={initiative}
                  onStartInitiative={startInitiative}
                  onAdvanceTurn={advanceInitiative}
                  onEndInitiative={endInitiative}
                  busy={initiativeBusy}
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
                <TacticalMap gridFtPerCell={gridFt} isDm={isDm} />
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
        />
      </Box>
      <CreateCharacterDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={createCharacter}
        submitting={creatingCharacter}
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
