import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import type { GameListEntry } from '../types/game';
import { formatError } from '../utils/errors';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [gameEntries, setGameEntries] = useState<GameListEntry[]>([]);
  const [newGameTitle, setNewGameTitle] = useState('Thursday DCC');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);

  const loadGames = useCallback(async () => {
    if (!user) {
      setGameEntries([]);
      return;
    }
    setLoadingGames(true);
    try {
      const data = await api<{ games: GameListEntry[] }>('/games');
      setGameEntries(data.games ?? []);
      setError(null);
    } catch (e) {
      setError(formatError(e));
      setGameEntries([]);
    } finally {
      setLoadingGames(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadGames();
    else setGameEntries([]);
  }, [user, loadGames]);

  const createGame = async () => {
    try {
      const { game } = await api<{ game: GameListEntry['game']; role: 'dm' }>('/games', {
        method: 'POST',
        body: JSON.stringify({ title: newGameTitle }),
      });
      await loadGames();
      navigate(`/game/${game.id}`);
    } catch (e) {
      setError(formatError(e));
    }
  };

  const joinGame = async () => {
    try {
      const { game } = await api<{ game: GameListEntry['game']; role: string }>(
        `/games/join/${encodeURIComponent(inviteCode.trim())}`,
        { method: 'POST' },
      );
      setInviteCode('');
      await loadGames();
      navigate(`/game/${game.id}`);
    } catch (e) {
      setError(formatError(e));
    }
  };

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Typography variant="h4" gutterBottom fontFamily="Cinzel, serif">
          Your games
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in to see sessions you run or have joined. Only the game creator has DM tools.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {authLoading && (
          <Typography color="text.secondary">Loading account…</Typography>
        )}

        {!authLoading && !user && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sign in to continue
            </Typography>
            <Typography color="text.secondary">
              Use <strong>Dev DM</strong> or <strong>Dev Player</strong> in the header (separate
              test accounts), or Discord. You will only see games you created or joined.
            </Typography>
          </Paper>
        )}

        {user && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  New session
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Game title"
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={createGame}
                  >
                    Create game (you are DM)
                  </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Join session
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    label="Invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    fullWidth
                    placeholder="e.g. BQQ7Q6M5"
                  />
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<LoginIcon />}
                    onClick={joinGame}
                    disabled={!inviteCode.trim()}
                  >
                    Join game
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, minHeight: 280 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Your active games
                  </Typography>
                  <Button size="small" onClick={loadGames} disabled={loadingGames}>
                    Refresh
                  </Button>
                </Stack>
                {gameEntries.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <SportsEsportsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No games yet. Create one or join with an invite code.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {gameEntries.map(({ game, role }) => (
                      <ListItemButton
                        key={game.id}
                        onClick={() => navigate(`/game/${game.id}`)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemText
                          primary={game.title}
                          secondary={`Invite: ${game.inviteCode}`}
                        />
                        <Chip
                          size="small"
                          label={role === 'dm' ? 'DM (creator)' : 'Player'}
                          color={role === 'dm' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </AppShell>
  );
}
