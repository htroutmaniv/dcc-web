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
  countConsumables,
  isUsingLightSource,
  USING_LIGHT_SOURCE_KEY,
  type ConsumableTrackKind,
} from '@dcc-web/shared';
import type { Character, DiceResult, GameDetail } from '../types/game';
import { buildItemsAfterConsumableDelta } from '../utils/consumables';
import { getCombatRollSpec, type CombatRollKind } from '../utils/combat-rolls';
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
  const [diceNotation, setDiceNotation] = useState('1d20');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [rollingCharacterId, setRollingCharacterId] = useState<string | null>(null);
  const [rollingKind, setRollingKind] = useState<CombatRollKind | null>(null);
  const [combatRollByCharacter, setCombatRollByCharacter] = useState<
    Record<string, DiceResult>
  >({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [consumableAdjustingId, setConsumableAdjustingId] = useState<string | null>(null);

  const isDm = detail?.isDm ?? false;

  const loadDetail = useCallback(async () => {
    if (!gameId) return;
    const data = await api<GameDetail>(`/games/${gameId}`);
    setDetail(data);
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
    const { notation, reason } = getCombatRollSpec(character, kind);
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

  const rollDice = async () => {
    if (!gameId) return;
    try {
      const { result } = await api<{ result: DiceResult }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          notation: diceNotation,
          reason: 'Table roll',
        }),
      });
      setLastRoll(result);
      setMenuTab('dice');
      setError(null);
    } catch (e) {
      setError(formatError(e));
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
            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
              <TacticalMap gridFtPerCell={gridFt} isDm={isDm} />
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
          onRollD20={rollDice}
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
          diceNotation={diceNotation}
          onDiceNotationChange={setDiceNotation}
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
