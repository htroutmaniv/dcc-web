import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, ApiError } from '../api/client';
import { AppShell } from '../components/AppShell';
import { GameSideMenu, type GameMenuTab } from '../components/GameSideMenu';
import { TacticalMap } from '../components/TacticalMap';
import type { Character, DiceResult, GameDetail } from '../types/game';
import { formatError } from '../utils/errors';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceResult | null>(null);
  const [menuTab, setMenuTab] = useState<GameMenuTab>('characters');
  const [diceNotation, setDiceNotation] = useState('1d20');

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

  const generateCharacter = async () => {
    if (!gameId) return;
    try {
      await api(`/games/${gameId}/characters/generate`, {
        method: 'POST',
        body: JSON.stringify({ level: 0 }),
      });
      await loadCharacters();
      setMenuTab('characters');
      setError(null);
    } catch (e) {
      setError(formatError(e));
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

  const markDead = async (characterId: string) => {
    try {
      await api(`/characters/${characterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dead' }),
      });
      await loadCharacters();
    } catch (e) {
      setError(formatError(e));
    }
  };

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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, minWidth: 0 }}>
          <TacticalMap gridFtPerCell={gridFt} isDm={isDm} />
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
          onGenerateCharacter={generateCharacter}
          onRollD20={rollDice}
          onMarkDead={markDead}
          diceNotation={diceNotation}
          onDiceNotationChange={setDiceNotation}
        />
      </Box>
    </AppShell>
  );
}
