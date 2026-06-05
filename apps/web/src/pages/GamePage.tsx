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
  buildDiceNotation,
  countConsumables,
  emptyDiceTray,
  isCharacterTurn,
  isUsingLightSource,
  parseGameInitiative,
  parseGameSettings,
  USING_LIGHT_SOURCE_KEY,
  type ConsumableTrackKind,
  type DiceTrayCounts,
  type GameInitiativeState,
} from '@dcc-web/shared';
import { DmControlPanel } from '../components/DmControlPanel';
import { InitiativeOrderPanel } from '../components/InitiativeOrderPanel';
import type { Character, DiceResult, GameDetail } from '../types/game';
import { buildItemsAfterConsumableDelta } from '../utils/consumables';
import {
  getCharacterRollSpec,
  type CharacterRollKind,
  type CombatRollKind,
} from '../utils/character-rolls';
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
  const [initiative, setInitiative] = useState<GameInitiativeState | null>(null);
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [endTurnCharacterId, setEndTurnCharacterId] = useState<string | null>(null);

  const isDm = detail?.isDm ?? false;

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

  const handleCharacterUpdated = useCallback((updated: Character) => {
    setSelectedCharacter((prev) => (prev?.id === updated.id ? updated : prev));
    setCharacters((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }, []);

  const canEditCharacter = useCallback(
    (c: Character) => isDm || (user != null && c.ownerUserId === user.id),
    [isDm, user],
  );

  const adjustConsumable = async (
    character: Character,
    kind: ConsumableTrackKind,
    delta: number,
  ) => {
    if (!canEditCharacter(character)) return;
    setConsumableAdjustingId(character.id);
    try {
      const items = buildItemsAfterConsumableDelta(character, kind, delta);
      const { character: updated } = await api<{ character: Character }>(
        `/characters/${character.id}/items`,
        { method: 'PUT', body: JSON.stringify({ items }) },
      );
      let next = updated;
      if (
        kind === 'light' &&
        countConsumables(updated.items ?? [], 'light') === 0 &&
        isUsingLightSource(updated)
      ) {
        const prevStats = updated.stats ?? {};
        const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
        const res = await api<{ character: Character }>(
          `/characters/${updated.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              stats: {
                ...prevStats,
                custom: { ...prevCustom, [USING_LIGHT_SOURCE_KEY]: false },
              },
            }),
          },
        );
        next = res.character;
      }
      handleCharacterUpdated(next);
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

  const toggleLightSource = async (character: Character, using: boolean) => {
    if (!canEditCharacter(character)) return;
    if (using && countConsumables(character.items ?? [], 'light') <= 0) return;
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
              custom: { ...prevCustom, [USING_LIGHT_SOURCE_KEY]: using },
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
          onAdjustConsumable={adjustConsumable}
          onToggleLightSource={toggleLightSource}
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
    </AppShell>
  );
}
